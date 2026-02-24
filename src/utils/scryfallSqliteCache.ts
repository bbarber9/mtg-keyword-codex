import { inArray, sql } from "drizzle-orm";
import { db } from "../db/db";
import { cards as cardsTable } from "../db/schema/codex-schema";
import {
  normalizeCardName,
  type ScryfallCache,
  type ScryfallCard,
} from "./scryfall";

type CardCacheRow = {
  name: string;
  data_json: string;
};

export class ScryfallSqliteCache implements ScryfallCache {
  async getByNames(
    names: string[],
  ): Promise<{ cards: ScryfallCard[]; missingNames: string[] }> {
    const normalizedNames = names.map(normalizeCardName).filter(Boolean);
    if (normalizedNames.length === 0) {
      return { cards: [], missingNames: [] };
    }

    const cachedRows = (await db
      .select({
        name: cardsTable.name,
        data_json: cardsTable.data_json,
      })
      .from(cardsTable)
      .where(inArray(cardsTable.name, normalizedNames))) as CardCacheRow[];

    const cachedCards: ScryfallCard[] = [];
    for (const row of cachedRows) {
      try {
        const parsedCard = JSON.parse(row.data_json) as ScryfallCard;
        cachedCards.push(parsedCard);
      } catch {
        console.warn("Skipping invalid cached card JSON", row.name);
      }
    }

    const foundNames = new Set(cachedRows.map((row) => row.name));
    const missingNames = normalizedNames.filter((name) => !foundNames.has(name));

    return { cards: cachedCards, missingNames };
  }

  async set(cards: ScryfallCard[]): Promise<void> {
    if (cards.length === 0) {
      return;
    }

    const updatedAt = new Date().toISOString();
    const valuesToStore = cards.flatMap((card) => {
      if (typeof card?.id !== "string" || typeof card?.name !== "string") {
        console.warn("Skipping card with invalid id/name", card);
        return [];
      }

      const normalizedName = normalizeCardName(card.name);
      if (!normalizedName) {
        console.warn("Skipping card with empty normalized name", card.name);
        return [];
      }

      return [
        {
          id: card.id,
          name: normalizedName,
          data_json: JSON.stringify(card),
          updated_at: updatedAt,
        },
      ];
    });

    if (valuesToStore.length === 0) {
      return;
    }

    await db
      .insert(cardsTable)
      .values(valuesToStore)
      .onConflictDoUpdate({
        target: cardsTable.name,
        set: {
          id: sql`excluded.id`,
          data_json: sql`excluded.data_json`,
          updated_at: sql`excluded.updated_at`,
        },
      });
  }
}
