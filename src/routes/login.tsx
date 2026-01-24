import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "../components/Frame/Frame";
import { LoginForm } from "../components/LoginForm/LoginForm";

export const Route = createFileRoute("/login")({
	component: Login,
});

export function Login() {
	return (
		<Frame>
			<LoginForm />
		</Frame>
	);
}
