import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCodex } from "../actions/createCodex";
import { CodexPage, CodexPageEmptyState } from "../components/CodexPage/CodexPage";

export const Route = createFileRoute("/codices/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const codex = await getCodex({ data: { id: params.id } });

		if (!codex) {
			throw notFound();
		}

		return codex;
	},
	notFoundComponent: () => {
		return <CodexPageEmptyState />;
	},
});

function RouteComponent() {
	const codex = Route.useLoaderData();

	return <CodexPage codex={codex} />;
}
