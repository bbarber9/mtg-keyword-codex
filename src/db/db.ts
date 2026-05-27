import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { loadConfig } from "../utils/config";

const config = loadConfig();
const sqlite = new Database(config.database.codexPath);

export const db = drizzle(sqlite);
