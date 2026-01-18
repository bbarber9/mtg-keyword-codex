import { normalizeCardName, type ScryfallCache, type ScryfallCard } from "./scryfall";

export class ScryfallFileCache implements ScryfallCache {

    private cacheData = new Map<string, ScryfallCard>();
    private isCacheLoaded = false;

    constructor(private filePath: string) { }

    private async loadCache() {
        const file = Bun.file(this.filePath);
        if (!await file.exists()) {
            return;
        }
        const content = await file.text();
        const cachedCards = JSON.parse(content) as ScryfallCard[];
        for (const card of cachedCards) {
            const normalizedName = normalizeCardName(card.name);
            this.cacheData.set(normalizedName, card);
        }
        this.isCacheLoaded = true;
    }

    async set(cards: ScryfallCard[]): Promise<void> {
        if (!this.isCacheLoaded) {
            await this.loadCache();
        }
        for (const card of cards) {
            const normalizedName = normalizeCardName(card.name);
            this.cacheData.set(normalizedName, card);
        }
        const file = Bun.file(this.filePath);
        const content = JSON.stringify(Array.from(this.cacheData.values()), null, 2);
        await Bun.write(file, content);
    }



    async getByNames(names: string[]) {
        if (!this.isCacheLoaded) {
            await this.loadCache();
        }
        const foundCards: ScryfallCard[] = [];
        const missingNames: string[] = [];
        for (const name of names) {
            const normalizedName = normalizeCardName(name);
            const card = this.cacheData.get(normalizedName);
            if (card) {
                foundCards.push(card);
            } else {
                missingNames.push(normalizedName);
            }
        }
        return { cards: foundCards, missingNames };
    }
}
