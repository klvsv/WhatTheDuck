require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const bcrypt = require("bcrypt");
const fs = require("fs").promises;
const cookieSession = require("cookie-session");
const cors = require("cors");
const { body, validationResult } = require("express-validator");

const app = express();
const port = 3001;

async function readJSONFile(filename) {
	try {
		const data = await fs.readFile(filename, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		} else if (error instanceof SyntaxError) {
			console.warn(`${filename} contains invalid JSON. Initializing with an empty array.`);
			return [];
		}
		throw error;
	}
}

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(
	cookieSession({
		name: "session",
		keys: [process.env.COOKIE_KEY],
		maxAge: 24 * 60 * 60 * 1000,
	})
);

// Use JSON parsing for all routes except /webhook
app.use((req, res, next) => {
	if (req.originalUrl === "/webhook") {
		next();
	} else {
		express.json()(req, res, next);
	}
});

console.log("Is Stripe key loaded?:", process.env.STRIPE_SECRET_KEY ? "Yes" : "No");
console.log("Webhook secret loaded:", process.env.STRIPE_WEBHOOK_SECRET ? "Yes" : "No");

// User authentication middleware
const authenticateUser = (req, res, next) => {
	if (req.session.userId) {
		next();
	} else {
		res.status(401).json({ error: "Unauthorized" });
	}
};

// Input validation middleware
const validate = (validations) => {
	return async (req, res, next) => {
		await Promise.all(validations.map((validation) => validation.run(req)));
		const errors = validationResult(req);
		if (errors.isEmpty()) {
			return next();
		}
		res.status(400).json({ errors: errors.array() });
	};
};

// User registration
app.post("/register", validate([body("email").isEmail().withMessage("Invalid email address"), body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")]), async (req, res) => {
	const { email, password } = req.body;

	try {
		const hashedPassword = await bcrypt.hash(password, 10);
		const users = await readJSONFile("users.json");

		if (users.find((user) => user.email === email)) {
			return res.status(400).json({ error: "This user already exists." });
		}

		const stripeCustomer = await stripe.customers.create({ email });
		users.push({ email, password: hashedPassword, stripeCustomerId: stripeCustomer.id });
		await fs.writeFile("users.json", JSON.stringify(users, null, 2));

		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		console.error("Registration error:", error);
		res.status(500).json({ error: "Server error during registration", details: error.message });
	}
});

// User login
app.post("/login", validate([body("email").isEmail().withMessage("Invalid email address"), body("password").notEmpty().withMessage("Password is required")]), async (req, res) => {
	const { email, password } = req.body;

	try {
		const users = await readJSONFile("users.json");
		const user = users.find((user) => user.email === email);

		if (user && (await bcrypt.compare(password, user.password))) {
			req.session.userId = user.email;
			req.session.stripeCustomerId = user.stripeCustomerId;
			res.json({ message: "Login successful" });
		} else {
			res.status(401).json({ error: "Username and/or password was incorrect." });
		}
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Server error during login" });
	}
});

// User logout
app.post("/logout", (req, res) => {
	req.session = null;
	res.sendStatus(200);
});

// Fetch products from Stripe
app.get("/products", async (req, res) => {
	try {
		console.log("Fetching products from Stripe...");
		const products = await stripe.products.list({ active: true, expand: ["data.default_price"] });
		console.log("Products fetched:", products.data.length);
		res.json(products.data);
	} catch (error) {
		console.error("Error fetching products:", error);
		res.status(500).json({ error: "Error fetching products", details: error.message });
	}
});

// Create Checkout Session
app.post("/create-checkout-session", authenticateUser, async (req, res) => {
	const { items } = req.body;

	if (!items || !Array.isArray(items) || items.length === 0) {
		return res.status(400).json({ error: "Invalid items in the cart" });
	}

	try {
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ["card"],
			line_items: items.map((item) => ({
				price: item.price,
				quantity: item.quantity,
			})),
			mode: "payment",
			success_url: `${process.env.CLIENT_URL}/success`,
			cancel_url: `${process.env.CLIENT_URL}/cancel`,
			customer: req.session.stripeCustomerId,
		});

		res.json({ sessionId: session.id });
	} catch (error) {
		console.error("Error creating checkout session:", error);
		res.status(500).json({ error: "Error creating checkout session" });
	}
});

// Webhook to handle successful payments
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
	const sig = req.headers["stripe-signature"];
	let event;

	try {
		event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
		console.log("Event constructed successfully:", event.type);
	} catch (err) {
		console.error(`Webhook Error: ${err.message}`);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Handle the event
	switch (event.type) {
		case "checkout.session.completed":
			const session = event.data.object;
			console.log("Checkout session completed:", session.id);
			await fulfillOrder(session);
			break;
		default:
			console.log(`Unhandled event type ${event.type}`);
	}

	// Return a 200 response to acknowledge receipt of the event
	res.send();
});

async function fulfillOrder(session) {
	console.log("Fulfilling order for session:", session.id);
	try {
		const retrievedSession = await stripe.checkout.sessions.retrieve(session.id, {
			expand: ["line_items"],
		});
		console.log("Retrieved session details:", JSON.stringify(retrievedSession, null, 2));

		const newOrder = {
			orderId: session.id,
			date: new Date().toISOString(),
			customer: session.customer_details.email,
			items: retrievedSession.line_items.data.map((item) => ({
				product: item.description,
				quantity: item.quantity,
				price: item.amount_total / 100,
			})),
			total: session.amount_total / 100,
			status: "completed",
		};
		console.log("New order object:", JSON.stringify(newOrder, null, 2));

		const orders = await readJSONFile("orders.json");
		console.log("Current orders:", JSON.stringify(orders, null, 2));

		orders.push(newOrder);

		await fs.writeFile("orders.json", JSON.stringify(orders, null, 2));
		console.log("Order saved successfully:", newOrder.orderId);
	} catch (error) {
		console.error("Error fulfilling order:", error);
	}
}

// Test write route REMOVE THIS WHEN DONE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
app.get("/test-write", async (req, res) => {
	try {
		await fs.writeFile("test.txt", "This is a test");
		console.log("Test file written successfully");
		res.send("File written successfully");
	} catch (error) {
		console.error("Error writing file:", error);
		res.status(500).send("Error writing file");
	}
}); // REMOVE WHEN DONE !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: "An unexpected error occurred" });
});

// 404 Not Found handler
app.use((req, res) => {
	res.status(404).json({ error: "Not Found" });
});

// Helper function to ensure JSON files exist
async function ensureFileExists(filename, defaultContent = "[]") {
	try {
		await fs.access(filename);
	} catch (error) {
		if (error.code === "ENOENT") {
			await fs.writeFile(filename, defaultContent);
			console.log(`Created ${filename} with default content.`);
		} else {
			throw error;
		}
	}
}

// Ensure necessary files exist when starting the server
(async () => {
	try {
		await ensureFileExists("users.json");
		await ensureFileExists("orders.json");
		console.log("Initialization complete. Server is ready.");
	} catch (error) {
		console.error("Error during initialization:", error);
		process.exit(1);
	}
})();

app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
