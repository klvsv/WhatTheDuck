import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface SuccessProps {
	clearCart: () => void;
}

export const Success: React.FC<SuccessProps> = ({ clearCart }) => {
	const navigate = useNavigate();

	useEffect(() => {
		clearCart();
		const timer = setTimeout(() => navigate("/"), 5000);
		return () => clearTimeout(timer);
	}, [navigate, clearCart]);

	return (
		<div>
			<h1>Great success!</h1>
			<p>
				Your order has been placed. 🤗 Thank you for shopping at <strong>What The Duck</strong>.
			</p>
		</div>
	);
};
