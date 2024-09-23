import React from "react";
import { Product } from "../types";

interface HomeProps {
	products: Product[];
	addToCart: (product: Product) => void;
	isLoggedIn: boolean;
}

export const Home: React.FC<HomeProps> = ({ products, addToCart, isLoggedIn }) => {
	return (
		<div className="product-grid">
			{products.map((product) => (
				<div key={product.id}>
					<h2>{product.name}</h2>
					{product.images[0] && (
						<img
							src={product.images[0]}
							alt={product.name}
							style={{ width: "100%" }}
						/>
					)}
					<div className="description-card">
						<p className="product-description">{product.description}</p>
						<p className="pricetag">{product.default_price && product.default_price.unit_amount ? `$${(product.default_price.unit_amount / 100).toFixed(2)}` : "Price not available"}</p>
					</div>
					<button
						className="addtocart-btn"
						onClick={() => addToCart(product)}
						disabled={!isLoggedIn || !product.default_price}
					>
						Add to Cart
					</button>
					{!isLoggedIn}
					{!product.default_price && <span>Product not available for purchase</span>}
				</div>
			))}
		</div>
	);
};
