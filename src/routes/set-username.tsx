import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "../components/Frame/Frame";
import { UsernameForm } from "../components/UsernameForm/UsernameForm";

export const Route = createFileRoute("/set-username")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Frame>
			<UsernameForm />
		</Frame>
	);
}
