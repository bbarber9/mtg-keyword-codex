import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { loadConfig } from "../utils/config";

const MIGRATIONS_DIR = "src/db/migrations";
const config = loadConfig();
const sqlite = new Database(config.database.codexPath);
const db = drizzle(sqlite);

try {
	migrate(db, { migrationsFolder: MIGRATIONS_DIR });
} finally {
	sqlite.close();
}
