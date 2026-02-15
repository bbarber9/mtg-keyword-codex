import { createFileRoute } from "@tanstack/react-router";
import { CodexCreateForm } from "../components/CodexCreateForm/CodexCreateForm";
import { protectedByLogin } from "../middleware/authMiddleware";

export const Route = createFileRoute("/codices/create")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	return <CodexCreateForm />;
}
