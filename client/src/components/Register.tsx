import React, { useState } from "react";

interface RegisterProps {
	handleRegister: (email: string, password: string) => Promise<string>;
}

export const Register: React.FC<RegisterProps> = ({ handleRegister }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccessMessage("");
		try {
			const message = await handleRegister(email, password);
			setSuccessMessage(message);
			setEmail("");
			setPassword("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "You must provide a valid email and a password with atleast 6 characters");
		}
	};

	return (
		<div>
			<h1>Register</h1>
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
				<button type="submit">Register</button>
			</form>
			{error && <p style={{ color: "red" }}>{error}</p>}
			{successMessage && <p style={{ color: "green" }}>{successMessage}</p>}
		</div>
	);
};
