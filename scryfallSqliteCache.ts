import { Database } from "bun:sqlite";
import { normalizeCardName, type ScryfallCache, type ScryfallCard } from "./scryfall";

export const DEFAULT_SCRYFALL_DB_PATH = "scryfall-cache.sqlite";
export const SCRYFALL_DB_PATH_ENV = "SCRYFALL_DB_PATH";

const TABLE_CARDS = "cards";
const COLUMN_ID = "id";
const COLUMN_NAME = "name";
const COLUMN_DATA_JSON = "data_json";
const COLUMN_UPDATED_AT = "updated_at";

const CREATE_CARDS_TABLE_SQL = `
  create table if not exists ${TABLE_CARDS} (
    ${COLUMN_ID} text primary key,
    ${COLUMN_NAME} text not null unique,
    ${COLUMN_DATA_JSON} text not null,
    ${COLUMN_UPDATED_AT} text not null
  );
`;

const CREATE_CARDS_NAME_INDEX_SQL = `
  create index if not exists ${TABLE_CARDS}_${COLUMN_NAME}_idx
  on ${TABLE_CARDS}(${COLUMN_NAME});
`;

const UPSERT_CARD_SQL = `
  insert into ${TABLE_CARDS} (${COLUMN_ID}, ${COLUMN_NAME}, ${COLUMN_DATA_JSON}, ${COLUMN_UPDATED_AT})
  values ($id, $name, $data_json, $updated_at)
  on conflict(${COLUMN_NAME}) do update set
    ${COLUMN_ID} = excluded.${COLUMN_ID},
    ${COLUMN_DATA_JSON} = excluded.${COLUMN_DATA_JSON},
    ${COLUMN_UPDATED_AT} = excluded.${COLUMN_UPDATED_AT};
`;

type CardRow = {
  name: string;
  data_json: string;
};

export class ScryfallSqliteCache implements ScryfallCache {
  private database: Database;

  constructor(databasePath: string = DEFAULT_SCRYFALL_DB_PATH) {
    this.database = new Database(databasePath);
    this.initializeSchema();
  }

  async getByNames(
    names: string[],
  ): Promise<{ cards: ScryfallCard[]; missingNames: string[] }> {
    const normalizedNames = names.map(normalizeCardName).filter(Boolean);
    if (normalizedNames.length === 0) {
      return { cards: [], missingNames: [] };
    }

    const placeholders = normalizedNames.map(() => "?").join(", ");
    const query = `
      select ${COLUMN_NAME}, ${COLUMN_DATA_JSON}
      from ${TABLE_CARDS}
      where ${COLUMN_NAME} in (${placeholders});
    `;

    const rows = this.database
      .query(query)
      .all(...normalizedNames) as CardRow[];

    const cards = rows.map((row) => JSON.parse(row.data_json) as ScryfallCard);
    const foundNames = new Set(rows.map((row) => row.name));
    const missingNames = normalizedNames.filter(
      (name) => !foundNames.has(name),
    );

    return { cards, missingNames };
  }

  async set(cards: ScryfallCard[]): Promise<void> {
    if (cards.length === 0) {
      return;
    }

    const statement = this.database.prepare(UPSERT_CARD_SQL);
    const updatedAt = new Date().toISOString();
    const transaction = this.database.transaction(
      (cardsToStore: ScryfallCard[]) => {
        for (const card of cardsToStore) {
          if (typeof card?.id !== "string" || typeof card?.name !== "string") {
            console.warn("Skipping card with invalid id/name", card);
            continue;
          }

          const normalizedName = normalizeCardName(card.name);
          if (!normalizedName) {
            console.warn("Skipping card with empty normalized name", card.name);
            continue;
          }

          const dataJson = JSON.stringify(card);
          if (typeof dataJson !== "string") {
            console.warn("Skipping card with unserializable payload", card.name);
            continue;
          }

          statement.run({
            $id: card.id,
            $name: normalizedName,
            $data_json: dataJson,
            $updated_at: updatedAt,
          });
        }
      },
    );

    transaction(cards);
  }

  private initializeSchema(): void {
    this.database.run(CREATE_CARDS_TABLE_SQL);
    this.database.run(CREATE_CARDS_NAME_INDEX_SQL);
  }
}
