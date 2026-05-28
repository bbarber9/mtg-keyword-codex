import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "../components/Button/Button";
import { protectedByLogin } from "../middleware/authMiddleware";

const createCodexRoutePath = "/codices/create";

export const Route = createFileRoute("/codices/")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	const navigate = useNavigate();

	return (
		<Button
			type="button"
			onClick={() => {
				navigate({ to: createCodexRoutePath });
			}}
		>
			Create
		</Button>
	);
}
