import { describe, expect, it, vi } from "vitest";
import { submitUsername } from "./UsernameForm";

describe("submitUsername", () => {
	it("redirects to the test page after successfully setting a username", async () => {
		const updateUser = vi.fn().mockResolvedValue({ error: null });
		const navigate = vi.fn().mockResolvedValue(undefined);

		await submitUsername({
			navigate,
			updateUser,
			username: "ajani",
		});

		expect(updateUser).toHaveBeenCalledWith({ username: "ajani" });
		expect(navigate).toHaveBeenCalledWith({ to: "/test" });
	});
});
