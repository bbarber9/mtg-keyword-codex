import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const cards = sqliteTable(
	"cards",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull().unique(),
		data_json: text("data_json").notNull(),
		updated_at: text("updated_at").notNull(),
	},
	(table) => [index("cards_name_idx").on(table.name)],
);

export const cheatsheets = sqliteTable(
	"cheatsheets",
	{
		id: text("id").primaryKey(),
		owner_id: text("owner_id").notNull(),
		title: text("title").notNull(),
		link: text("link"),
		primer: text("primer"),
		normalized_decklist: text("normalized_decklist").notNull(),
		created_at: text("created_at").notNull(),
		last_accessed_at: text("last_accessed_at").notNull(),
		expires_at: text("expires_at").notNull(),
	},
	(table) => [
		index("cheatsheets_owner_id_idx").on(table.owner_id),
		index("cheatsheets_expires_at_idx").on(table.expires_at),
	],
);

export const cheatsheetKeywords = sqliteTable(
	"cheatsheet_keywords",
	{
		cheatsheet_id: text("cheatsheet_id")
			.notNull()
			.references(() => cheatsheets.id, { onDelete: "cascade" }),
		keyword: text("keyword").notNull(),
		count: integer("count").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.cheatsheet_id, table.keyword] }),
		index("cheatsheet_keywords_cheatsheet_id_idx").on(table.cheatsheet_id),
	],
);
