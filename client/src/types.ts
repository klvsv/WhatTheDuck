export interface Product {
	id: string;
	name: string;
	description: string;
	images: string[];
	default_price: {
		id: string;
		unit_amount: number;
	};
}

export interface CartItem extends Product {
	quantity: number;
}

export interface StoredCart {
	items: CartItem[];
	timestamp: number;
}
