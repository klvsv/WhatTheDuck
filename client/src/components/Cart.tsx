import React from "react";
import { CartItem } from "../types";

interface CartProps {
	cart: CartItem[];
	removeFromCart: (productId: string) => void;
	handleCheckout: () => Promise<void>;
}

export const Cart: React.FC<CartProps> = ({ cart, removeFromCart, handleCheckout }) => {
	const totalPrice = cart.reduce((sum, item) => sum + item.default_price.unit_amount * item.quantity, 0) / 100;

	return (
		<div>
			<h1>Cart</h1>
			<div className="product-grid">
				{cart.map((item) => (
					<div key={item.id}>
						<h2>{item.name}</h2>
						<p>Quantity: {item.quantity}</p>
						<p>Price: ${(item.default_price.unit_amount * item.quantity) / 100}</p>
						<button onClick={() => removeFromCart(item.id)}>Remove from Cart</button>
					</div>
				))}
			</div>
			<h3>Total: ${totalPrice.toFixed(2)}</h3>
			<button onClick={handleCheckout}>Checkout</button>
		</div>
	);
};
