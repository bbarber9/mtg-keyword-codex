import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
	normalizeCardName,
	type ScryfallCache,
	type ScryfallCard,
} from "./scryfall";

export class ScryfallFileCache implements ScryfallCache {
	private cacheData = new Map<string, ScryfallCard>();
	private isCacheLoaded = false;

	constructor(private filePath: string) {}

	private async loadCache() {
		let content: string;
		try {
			content = await readFile(this.filePath, "utf8");
		} catch (error) {
			if (isErrorWithCode(error, "ENOENT")) {
				return;
			}

			throw error;
		}

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
		const content = JSON.stringify(
			Array.from(this.cacheData.values()),
			null,
			2,
		);
		await mkdir(dirname(this.filePath), { recursive: true });
		await writeFile(this.filePath, content);
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

function isErrorWithCode(error: unknown, code: string): boolean {
	return error instanceof Error && "code" in error && error.code === code;
}
