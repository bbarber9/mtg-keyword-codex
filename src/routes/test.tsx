import { createFileRoute } from "@tanstack/react-router";
import { Button } from "../components/Button/Button";
import { Frame } from "../components/Frame/Frame";
import { protectedByLogin } from "../middleware/authMiddleware";
import { authClient } from "../utils/client-auth";

export const Route = createFileRoute("/test")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	const session = authClient.useSession();
	return (
		<Frame>
			<div>
				<pre>{JSON.stringify(session, null, 2)}</pre>
				<Button
					type="button"
					onClick={() => {
						authClient.signOut().then(() => {
							// reload to update the session state
							window.location.reload();
						});
					}}
				>
					Logout
				</Button>
			</div>
		</Frame>
	);
}
