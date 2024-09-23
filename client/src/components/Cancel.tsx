import React from "react";
import { Link } from "react-router-dom";

export const Cancel: React.FC = () => {
	return (
		<div>
			<h1>Order cancelled</h1>
			<p>Your order was cancelled and your cart is still holding your products.</p>
			<p>If you'd like to complete your purchase again, please continue to checkout.</p>
			<Link to="/cart">Return to Cart</Link>
		</div>
	);
};
