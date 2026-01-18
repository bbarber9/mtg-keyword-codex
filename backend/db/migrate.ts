import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const DEFAULT_DB_PATH = "codex.sqlite";
const DB_PATH_ENV = "CODEX_DB_PATH";
const MIGRATIONS_DIR = "backend/db/migrations";

const databasePath = process.env[DB_PATH_ENV] ?? DEFAULT_DB_PATH;
const sqlite = new Database(databasePath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: MIGRATIONS_DIR });
