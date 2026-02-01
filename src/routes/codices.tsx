import { createFileRoute } from "@tanstack/react-router";
import { CodicesPage } from "../components/CodicesPage/CodicesPage";
import { Frame } from "../components/Frame/Frame";
import { protectedByLogin } from "../middleware/authMiddleware";

export const Route = createFileRoute("/codices")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	return (
		<Frame>
			<CodicesPage />
		</Frame>
	);
}
