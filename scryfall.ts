export type ScryfallCard = {
  id: string;
  name: string;
  keywords?: string[];
  [key: string]: unknown;
};

export type ScryfallCollectionResponse = {
  data: ScryfallCard[];
  not_found?: Array<{ name: string }>;
};

export type ScryfallCache = {
  // Cache misses should be listed in missingNames.
  getByNames(
    names: string[],
  ): Promise<{ cards: ScryfallCard[]; missingNames: string[] }>;
  set(cards: ScryfallCard[]): Promise<void>;
};

export type ScryfallClientOptions = {
  cache?: ScryfallCache;
};

const USER_AGENT = "mtg-keyword-codex/0.1 (contact: hello@example.com)";
const RATE_LIMIT_GAP_MS = 100;
const RETRY_DELAY_MS = 5000;
const RETRY_LIMIT = 2;
const COLLECTION_LIMIT = 75;

export class ScryfallClient {
  private cache?: ScryfallCache;
  private lastRequestAt: number;

  constructor(options: ScryfallClientOptions = {}) {
    this.cache = options.cache;
    this.lastRequestAt = 0;
  }

  async getCardsByName(names: string[]): Promise<{
    cards: ScryfallCard[];
    notFound: string[];
  }> {
    const normalizedNames = names.map(normalizeName).filter(Boolean);
    if (normalizedNames.length === 0) {
      return { cards: [], notFound: [] };
    }

    let cached: ScryfallCard[] = [];
    let missing = normalizedNames;
    if (this.cache) {
      const cachedResult = await this.cache.getByNames(normalizedNames);
      cached = cachedResult.cards;
      missing = cachedResult.missingNames;
    }

    if (missing.length === 0) {
      return { cards: cached, notFound: [] };
    }

    const chunks = chunkArray(missing, COLLECTION_LIMIT);
    const fetchedCards: ScryfallCard[] = [];
    const notFound: string[] = [];

    for (const chunk of chunks) {
      const response = await this.fetchWithRateLimit(
        "https://api.scryfall.com/cards/collection",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
          },
          body: JSON.stringify({
            identifiers: chunk.map((name) => ({ name })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Scryfall error: ${response.status} ${response.statusText}`,
        );
      }

      const payload = (await response.json()) as ScryfallCollectionResponse;
      fetchedCards.push(...(payload.data ?? []));
      notFound.push(...(payload.not_found ?? []).map((item) => item.name));
    }

    if (this.cache && fetchedCards.length > 0) {
      await this.cache.set(fetchedCards);
    }

    const allCards = [...cached, ...fetchedCards];
    return { cards: allCards, notFound };
  }

  getKeywords(card: ScryfallCard): string[] {
    return Array.isArray(card.keywords) ? card.keywords : [];
  }

  private async fetchWithRateLimit(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    await this.waitForRateLimit();

    for (let attempt = 0; attempt < RETRY_LIMIT; attempt += 1) {
      const response = await fetch(url, init);

      if (response.status !== 429) {
        this.lastRequestAt = Date.now();
        return response;
      }

      await sleep(RETRY_DELAY_MS);
    }

    this.lastRequestAt = Date.now();
    return fetch(url, init);
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < RATE_LIMIT_GAP_MS) {
      await sleep(RATE_LIMIT_GAP_MS - elapsed);
    }
  }
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
