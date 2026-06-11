import { createFileRoute } from "@tanstack/react-router";
import { CheatsheetCreateForm } from "../components/CheatsheetCreateForm/CheatsheetCreateForm";
import { protectedByUsername } from "../middleware/authMiddleware";

export const Route = createFileRoute("/cheatsheets/create")({
	component: RouteComponent,
	server: { middleware: [protectedByUsername] },
});

function RouteComponent() {
	return <CheatsheetCreateForm />;
}
