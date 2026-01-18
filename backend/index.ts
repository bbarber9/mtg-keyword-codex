import { parseDecklist } from "./decklist";
import { ScryfallClient } from "./scryfall";
import {
  DEFAULT_SCRYFALL_DB_PATH,
  SCRYFALL_DB_PATH_ENV,
  ScryfallSqliteCache,
} from "./scryfallSqliteCache";

async function main() {
  const mockDecklist = Bun.file("mockDeckList.txt");
  const content = await mockDecklist.text();
  const parsed = parseDecklist(content);
  const databasePath =
    process.env[SCRYFALL_DB_PATH_ENV] ?? DEFAULT_SCRYFALL_DB_PATH;
  const sCache = new ScryfallSqliteCache(databasePath);
  const scryfall = new ScryfallClient({ cache: sCache });
  const names = parsed.map((entry) => entry.name);
  const { cards, notFound } = await scryfall.getCardsByName(names);
  console.log("Found cards:", cards.length);
  console.log("Not found:", notFound);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
