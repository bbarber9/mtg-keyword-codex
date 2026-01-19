import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { loadConfig } from "../utils/config";

const MIGRATIONS_DIR = "src/db/migrations";
const config = loadConfig();
const sqlite = new Database(config.database.codexPath);
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: MIGRATIONS_DIR });
