import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Home } from "./components/Home";
import { Cart } from "./components/Cart";
import { CartButton } from "./components/CartButton";
import { Register } from "./components/Register";
import { Login } from "./components/Login";
import { Success } from "./components/Success";
import { Cancel } from "./components/Cancel";
import { FaSkull } from "react-icons/fa";

import { Product, CartItem, StoredCart } from "./types";
import "./App.css";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY!);

const CART_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const App: React.FC = () => {
	const [cart, setCart] = useState<CartItem[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetchProducts();
		const storedLoginState = localStorage.getItem("isLoggedIn");
		const storedUserEmail = localStorage.getItem("userEmail");
		if (storedLoginState === "true" && storedUserEmail) {
			setIsLoggedIn(true);
			setUserEmail(storedUserEmail);
			restoreCart(storedUserEmail);
		}
	}, []);

	useEffect(() => {
		if (userEmail) {
			saveCart(userEmail, cart);
		}
	}, [cart, userEmail]);

	const fetchProducts = async () => {
		try {
			const response = await axios.get("http://localhost:3001/products");
			setProducts(response.data);
		} catch (error) {
			setError("Error fetching products. Please try again later.");
		}
	};

	const saveCart = (email: string, cartItems: CartItem[]) => {
		const storedCart: StoredCart = {
			items: cartItems,
			timestamp: new Date().getTime(),
		};
		localStorage.setItem(`cart_${email}`, JSON.stringify(storedCart));
	};

	const restoreCart = (email: string) => {
		const storedCartJSON = localStorage.getItem(`cart_${email}`);
		if (storedCartJSON) {
			const storedCart: StoredCart = JSON.parse(storedCartJSON);
			const currentTime = new Date().getTime();
			if (currentTime - storedCart.timestamp < CART_EXPIRATION_TIME) {
				setCart(storedCart.items);
			} else {
				localStorage.removeItem(`cart_${email}`);
			}
		}
	};

	const addToCart = (product: Product) => {
		if (!isLoggedIn) return; // Prevent adding to cart if not logged in
		setCart((prevCart) => {
			const existingItem = prevCart.find((item) => item.id === product.id);
			if (existingItem) {
				return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
			}
			return [...prevCart, { ...product, quantity: 1 }];
		});
	};

	const removeFromCart = (productId: string) => {
		setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
	};

	const handleCheckout = async () => {
		if (!isLoggedIn) {
			setError("Please log in to checkout");
			return;
		}

		if (cart.length === 0) {
			setError("Your cart is empty. Please add items before checking out.");
			return;
		}

		try {
			const stripe = await stripePromise;
			const response = await axios.post(
				"http://localhost:3001/create-checkout-session",
				{
					items: cart.map((item) => ({
						price: item.default_price.id,
						quantity: item.quantity,
					})),
				},
				{ withCredentials: true }
			);

			const { sessionId } = response.data;
			const result = await stripe!.redirectToCheckout({
				sessionId: sessionId,
			});

			if (result.error) {
				setError(result.error.message || "An error occurred during checkout");
			}
		} catch (error) {
			console.error("Checkout error:", error);
			setError("An error occurred during checkout. Please try again.");
		}
	};

	const handleRegister = async (email: string, password: string): Promise<string> => {
		try {
			await axios.post("http://localhost:3001/register", { email, password });
			return "Registration successful. Please log in.";
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(error.response.data.error || "Please register a valid email adress and a password with atleast 6 characters.");
			}
			throw new Error("An unexpected error occurred");
		}
	};

	const handleLogin = async (email: string, password: string): Promise<void> => {
		try {
			await axios.post("http://localhost:3001/login", { email, password }, { withCredentials: true });
			setIsLoggedIn(true);
			setUserEmail(email);
			localStorage.setItem("isLoggedIn", "true");
			localStorage.setItem("userEmail", email);
			restoreCart(email);
			setError(null);
		} catch (error) {
			if (axios.isAxiosError(error) && error.response) {
				throw new Error(error.response.data.error || "An error occurred during login");
			}
			throw new Error("An unexpected error occurred");
		}
	};

	const handleLogout = async () => {
		try {
			await axios.post("http://localhost:3001/logout", {}, { withCredentials: true });
			setIsLoggedIn(false);
			setUserEmail(null);
			localStorage.removeItem("isLoggedIn");
			localStorage.removeItem("userEmail");
			setCart([]);
			setError(null);
		} catch (error) {
			setError("An error occurred during logout. Please try again.");
		}
	};

	const clearCart = () => {
		setCart([]);
		if (userEmail) {
			localStorage.removeItem(`cart_${userEmail}`);
		}
	};

	return (
		<Router>
			<div className="app-container">
				<nav>
					<ul>
						<li className="nav-left">
							<Link
								to="/"
								className="logo-link"
							>
								<img
									src="/logo.png"
									alt="Store Logo"
									className="logo"
								/>
							</Link>
						</li>
						{!isLoggedIn ? (
							<>
								<li className="nav-right">
									<Link to="/login">Login</Link>
								</li>
								<li className="nav-right">
									<Link to="/register">Register</Link>
								</li>
							</>
						) : (
							<li className="nav-right">
								<button
									className="logout-btn"
									onClick={handleLogout}
								>
									<FaSkull /> Logout
								</button>
							</li>
						)}
						<li className="nav-right">
							<CartButton
								isLoggedIn={isLoggedIn}
								itemCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
							/>
						</li>
					</ul>
				</nav>

				{error && <p style={{ color: "red" }}>{error}</p>}

				<Routes>
					<Route
						path="/"
						element={
							<Home
								products={products}
								addToCart={addToCart}
								isLoggedIn={isLoggedIn}
							/>
						}
					/>
					<Route
						path="/cart"
						element={
							<Cart
								cart={cart}
								removeFromCart={removeFromCart}
								handleCheckout={handleCheckout}
							/>
						}
					/>
					<Route
						path="/register"
						element={
							isLoggedIn ? (
								<Navigate
									to="/"
									replace
								/>
							) : (
								<Register handleRegister={handleRegister} />
							)
						}
					/>
					<Route
						path="/login"
						element={
							isLoggedIn ? (
								<Navigate
									to="/"
									replace
								/>
							) : (
								<Login handleLogin={handleLogin} />
							)
						}
					/>
					<Route
						path="/success"
						element={<Success clearCart={clearCart} />}
					/>
					<Route
						path="/cancel"
						element={<Cancel />}
					/>
				</Routes>
			</div>
		</Router>
	);
};

export default App;
