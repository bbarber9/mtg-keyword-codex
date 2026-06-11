import { defineConfig } from "drizzle-kit";

const DEFAULT_DB_PATH = "cheatsheet.sqlite";
const DB_PATH_ENV = "CHEATSHEET_DB_PATH";

export default defineConfig({
	schema: "./src/db/schema",
	out: "./src/db/migrations",
	dialect: "sqlite",
	dbCredentials: {
		url: process.env[DB_PATH_ENV] ?? DEFAULT_DB_PATH,
	},
});
