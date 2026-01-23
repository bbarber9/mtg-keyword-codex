import { relations } from "drizzle-orm/relations";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    data_json: text("data_json").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (table) => ([index("cards_name_idx").on(table.name)]),
);

export const codices = sqliteTable(
  "codices",
  {
    id: text("id").primaryKey(),
    owner_id: text("owner_id").notNull(),
    title: text("title").notNull(),
    canonical_list: text("canonical_list").notNull(),
    summary_json: text("summary_json").notNull(),
    created_at: text("created_at").notNull(),
    last_accessed_at: text("last_accessed_at").notNull(),
    expires_at: text("expires_at").notNull(),
  },
  (table) => ([
    index("codices_owner_id_idx").on(table.owner_id),
    index("codices_expires_at_idx").on(table.expires_at),
  ]),
);
