import { createFileRoute } from "@tanstack/react-router";
import { CodicesPage } from "../components/CodicesPage/CodicesPage";
import { protectedByLogin } from "../middleware/authMiddleware";

export const Route = createFileRoute("/codices/create")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	return <CodicesPage />;
}
