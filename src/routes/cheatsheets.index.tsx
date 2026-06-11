import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/Button/Button";
import { protectedByUsername } from "../middleware/authMiddleware";

const createCheatsheetRoutePath = "/cheatsheets/create";

export const Route = createFileRoute("/cheatsheets/")({
	component: RouteComponent,
	server: { middleware: [protectedByUsername] },
});

function RouteComponent() {
	const navigate = useNavigate();

	return (
		<Button
			type="button"
			onClick={() => {
				navigate({ to: createCheatsheetRoutePath });
			}}
		>
			Create
		</Button>
	);
}
