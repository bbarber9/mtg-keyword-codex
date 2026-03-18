import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Frame } from "../components/Frame/Frame";

export const Route = createFileRoute("/codices")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Frame>
			<Outlet />
		</Frame>
	);
}
