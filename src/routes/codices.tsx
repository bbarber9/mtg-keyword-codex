import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { Button } from "../components/Button/Button";
import { Frame } from "../components/Frame/Frame";
import { protectedByLogin } from "../middleware/authMiddleware";

const codicesIndexPathname = "/codices";
const codicesIndexPathnameWithTrailingSlash = "/codices/";
const createCodexRoutePath = "/codices/create";

export const Route = createFileRoute("/codices")({
	component: RouteComponent,
	server: { middleware: [protectedByLogin] },
});

function RouteComponent() {
	const navigate = useNavigate();
	const location = useLocation();
	const isCodicesIndexRoute =
		location.pathname === codicesIndexPathname ||
		location.pathname === codicesIndexPathnameWithTrailingSlash;

	return (
		<Frame>
			{isCodicesIndexRoute ? (
				<Button
					type="button"
					onPress={() => {
						navigate({ to: createCodexRoutePath });
					}}
				>
					Create
				</Button>
			) : null}
			<Outlet />
		</Frame>
	);
}
