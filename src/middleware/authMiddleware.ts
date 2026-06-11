import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../utils/auth";

type AuthRedirectSession = {
	user: {
		username?: string | null;
	};
} | null;

type AuthRedirectOptions = {
	session: AuthRedirectSession;
	requireUsername: boolean;
};

export function getAuthRedirectTarget({
	session,
	requireUsername,
}: AuthRedirectOptions): "/login" | "/set-username" | null {
	if (!session) {
		return "/login";
	}

	if (requireUsername && !session.user.username) {
		return "/set-username";
	}

	return null;
}

export const protectedByLogin = createMiddleware().server(async ({ next }) => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	const redirectTarget = getAuthRedirectTarget({
		session,
		requireUsername: false,
	});

	if (redirectTarget) {
		throw redirect({ to: redirectTarget });
	}

	return await next();
});

export const protectedByUsername = createMiddleware().server(async ({ next }) => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	const redirectTarget = getAuthRedirectTarget({
		session,
		requireUsername: true,
	});

	if (redirectTarget) {
		throw redirect({ to: redirectTarget });
	}

	return await next();
});
