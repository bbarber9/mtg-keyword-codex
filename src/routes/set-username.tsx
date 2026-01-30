import { createFileRoute } from "@tanstack/react-router";
import { UsernameForm } from "../components/UsernameForm/UsernameForm";

export const Route = createFileRoute("/set-username")({
	component: RouteComponent,
});

function RouteComponent() {
	return <UsernameForm />;
}
