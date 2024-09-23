import React from "react";
import { Link } from "react-router-dom";
import { TiShoppingCart } from "react-icons/ti";
import "./CartButton.css";

interface CartButtonProps {
	isLoggedIn: boolean;
	itemCount: number;
}

export const CartButton: React.FC<CartButtonProps> = ({ isLoggedIn, itemCount }) => {
	return (
		<Link to="/cart">
			<button
				disabled={!isLoggedIn}
				className={!isLoggedIn ? "disabled-button" : ""}
			>
				<TiShoppingCart /> Cart ({itemCount}){!isLoggedIn && <span className="tooltip">Please register or login first</span>}
			</button>
		</Link>
	);
};
