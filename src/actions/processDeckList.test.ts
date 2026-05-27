import { describe, expect, it } from "vitest";
import type { DecklistEntry } from "../utils/decklist";
import type { ScryfallCard } from "../utils/scryfall";
import { buildKeywordCounts, formatNormalizedDecklist } from "./processDeckList";

describe("processDeckList helpers", () => {
	it("formats a normalized decklist from parsed entries", () => {
		const decklistEntries: DecklistEntry[] = [
			{ name: "Island", quantity: 15 },
			{ name: "Rhystic Study", quantity: 1 },
		];

		expect(formatNormalizedDecklist(decklistEntries)).toBe(
			"15 Island\n1 Rhystic Study",
		);
	});

	it("counts each detected keyword by deck quantity and de-duplicates per card", () => {
		const decklistEntries: DecklistEntry[] = [
			{ name: "Alpha Myr", quantity: 3 },
			{ name: "Beta Mage", quantity: 2 },
			{ name: "Missing Card", quantity: 4 },
		];
		const cards: ScryfallCard[] = [
			{
				id: "alpha",
				name: "Alpha Myr",
				oracle_text: "Put a charge counter on Alpha Myr.",
				keywords: ["Flying", "Flying"],
			},
			{
				id: "beta",
				name: "Beta Mage",
				oracle_text: "Whenever Beta Mage attacks, proliferate.",
				keywords: ["Flying", "First strike"],
			},
		];

		expect(buildKeywordCounts(decklistEntries, cards)).toEqual([
			{ keyword: "Flying", count: 5 },
			{ keyword: "Charge counter", count: 3 },
			{ keyword: "First strike", count: 2 },
		]);
	});
});
