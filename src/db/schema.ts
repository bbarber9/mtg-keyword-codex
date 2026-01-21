import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  provider_user_id: text("provider_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  avatar_url: text("avatar_url"),
  created_at: text("created_at").notNull(),
});

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
  (table) => ({
    ownerIndex: index("codices_owner_id_idx").on(table.owner_id),
    expiresIndex: index("codices_expires_at_idx").on(table.expires_at),
  }),
);
