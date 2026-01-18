import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const DEFAULT_DB_PATH = "codex.sqlite";
const DB_PATH_ENV = "CODEX_DB_PATH";

const databasePath = process.env[DB_PATH_ENV] ?? DEFAULT_DB_PATH;
const sqlite = new Database(databasePath);

export const db = drizzle(sqlite);
