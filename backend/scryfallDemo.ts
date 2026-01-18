import { loadConfig } from "./config";
import { parseDecklist } from "./decklist";
import { ScryfallClient } from "./scryfall";
import { ScryfallSqliteCache } from "./scryfallSqliteCache";

async function main() {
  const mockDecklist = Bun.file("mockDeckList.txt");
  const content = await mockDecklist.text();
  const parsed = parseDecklist(content);
  const config = loadConfig();
  const scryfallCache = new ScryfallSqliteCache(config.database.scryfallPath);
  const scryfall = new ScryfallClient({ cache: scryfallCache });
  const names = parsed.map((entry) => entry.name);
  const { cards, notFound } = await scryfall.getCardsByName(names);
  console.log("Found cards:", cards.length);
  console.log("Not found:", notFound);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
