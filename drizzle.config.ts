import { defineConfig } from "drizzle-kit";

const DEFAULT_DB_PATH = "codex.sqlite";
const DB_PATH_ENV = "CODEX_DB_PATH";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env[DB_PATH_ENV] ?? DEFAULT_DB_PATH,
  },
});
