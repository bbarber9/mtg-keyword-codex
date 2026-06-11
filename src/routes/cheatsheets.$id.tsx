import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCheatsheet } from "../actions/createCheatsheet";
import {
	CheatsheetPage,
	CheatsheetPageEmptyState,
} from "../components/CheatsheetPage/CheatsheetPage";

export const Route = createFileRoute("/cheatsheets/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const cheatsheet = await getCheatsheet({ data: { id: params.id } });

		if (!cheatsheet) {
			throw notFound();
		}

		return cheatsheet;
	},
	notFoundComponent: () => {
		return <CheatsheetPageEmptyState />;
	},
});

function RouteComponent() {
	const cheatsheet = Route.useLoaderData();

	return <CheatsheetPage cheatsheet={cheatsheet} />;
}
