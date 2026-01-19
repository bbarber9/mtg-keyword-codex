import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { loadConfig } from "../config";

const config = loadConfig();
const sqlite = new Database(config.database.codexPath);

export const db = drizzle(sqlite);
