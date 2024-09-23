import React, { useState } from "react";

interface LoginProps {
	handleLogin: (email: string, password: string) => Promise<void>;
}

export const Login: React.FC<LoginProps> = ({ handleLogin }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			await handleLogin(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An unexpected error occurred");
		}
	};

	return (
		<div>
			<h1>Login</h1>
			{error && <p style={{ color: "red" }}>{error}</p>}
			<form onSubmit={onSubmit}>
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
					placeholder="Email"
				/>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					placeholder="Password"
				/>
				<button type="submit">Login</button>
			</form>
		</div>
	);
};
