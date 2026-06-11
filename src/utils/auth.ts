import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "../db/db";
import * as schema from "../db/schema/auth-schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "sqlite", schema }),
	plugins: [tanstackStartCookies(), username()],
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID as string,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
		},
	},
});
