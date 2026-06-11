import { describe, expect, it } from "vitest";
import { getAuthRedirectTarget } from "./authMiddleware";

describe("getAuthRedirectTarget", () => {
	it("does not redirect a logged-in user without a username away from setup", () => {
		expect(
			getAuthRedirectTarget({
				session: { user: { username: null } },
				requireUsername: false,
			}),
		).toBeNull();
	});

	it("redirects a logged-in user without a username from protected app routes to setup", () => {
		expect(
			getAuthRedirectTarget({
				session: { user: { username: null } },
				requireUsername: true,
			}),
		).toBe("/set-username");
	});
});
