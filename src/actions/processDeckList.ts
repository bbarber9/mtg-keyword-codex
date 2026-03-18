import type { CounterTypeList } from "../data/types";
import CounterTypesJSON from "../data/wiki/counters.json";
import { AhoCorasickNodeSearcher } from "../utils/ahocorasick";
import { type DecklistEntry, parseDecklist } from "../utils/decklist";
import {
    normalizeCardName,
    type ScryfallCard,
    ScryfallClient,
} from "../utils/scryfall";
import { ScryfallSqliteCache } from "../utils/scryfallSqliteCache";

export type ProcessDeckListInput = {
    name: string;
    link: string;
    primer: string;
    decklist: string;
};

export type KeywordCount = {
    keyword: string;
    count: number;
};

export type ProcessedDecklist = {
    normalizedDecklist: string;
    keywords: KeywordCount[];
    notFound: string[];
};

const NEWLINE_DELIMITER = "\n";
const client = new ScryfallClient({ cache: new ScryfallSqliteCache() });
const counterTypes = CounterTypesJSON as CounterTypeList;
const counterParser = new AhoCorasickNodeSearcher();
const counterDisplayNamesBySearchTerm = new Map<string, string>();
Object.keys(counterTypes).forEach((counter) => {
    const normalizedCounterName = counter.toLowerCase();
    counterParser.addSearchTerm(normalizedCounterName);
    counterDisplayNamesBySearchTerm.set(normalizedCounterName, counter);
});
counterParser.buildFailureLinks();

export async function processDeckList(
    data: ProcessDeckListInput,
): Promise<ProcessedDecklist> {
    const decklistEntries = parseDecklist(data.decklist);
    const normalizedDecklist = formatNormalizedDecklist(decklistEntries);
    const { cards, notFound } = await client.getCardsByName(
        decklistEntries.map((entry) => entry.name),
    );

    if (notFound.length > 0) {
        console.warn(
            `The following cards were not found in Scryfall: ${notFound.join(", ")}`,
        );
    }

    return {
        normalizedDecklist,
        keywords: buildKeywordCounts(decklistEntries, cards),
        notFound,
    };
}

export function buildKeywordCounts(
    decklistEntries: DecklistEntry[],
    cards: ScryfallCard[],
): KeywordCount[] {
    const cardsByName = new Map(
        cards.map((card) => [normalizeCardName(card.name), card] as const),
    );
    const keywordCounts = new Map<string, number>();

    for (const decklistEntry of decklistEntries) {
        const card = cardsByName.get(normalizeCardName(decklistEntry.name));
        if (!card) {
            continue;
        }

        for (const keyword of getDetectedKeywordsForCard(card)) {
            keywordCounts.set(
                keyword,
                (keywordCounts.get(keyword) ?? 0) + decklistEntry.quantity,
            );
        }
    }

    return Array.from(keywordCounts.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((leftKeyword, rightKeyword) => {
            if (rightKeyword.count !== leftKeyword.count) {
                return rightKeyword.count - leftKeyword.count;
            }

            return leftKeyword.keyword.localeCompare(rightKeyword.keyword);
        });
}

export function formatNormalizedDecklist(
    decklistEntries: DecklistEntry[],
): string {
    return decklistEntries
        .map((entry) => `${entry.quantity} ${entry.name}`)
        .join(NEWLINE_DELIMITER);
}

function getDetectedKeywordsForCard(card: ScryfallCard): string[] {
    const detectedKeywords = new Set<string>();

    for (const keyword of getStructuredKeywords(card)) {
        detectedKeywords.add(keyword);
    }

    for (const result of counterParser.search(
        (card.oracle_text ?? "").toLowerCase(),
    )) {
        detectedKeywords.add(
            counterDisplayNamesBySearchTerm.get(result.value) ?? result.value,
        );
    }

    return Array.from(detectedKeywords);
}

function getStructuredKeywords(card: ScryfallCard): string[] {
    const knownKeywords = Array.isArray(card.keywords) ? card.keywords : [];

    return knownKeywords.filter((keyword) => keyword.length > 0);
}
