import { createServerFn } from "@tanstack/react-start";
import type {
    CounterTypeList,
    KeywordAbilityList,
    KeywordActionList,
} from "../data/types";
import CounterTypesJSON from "../data/wiki/counters.json";
import KeywordAbilitiesJSON from "../data/wiki/keyword-abilities.json";
import KeywordActionsJSON from "../data/wiki/keyword-actions.json";
import { AhoCorasickNodeSearcher } from "../utils/ahocorasick";
import { parseDecklist } from "../utils/decklist";
import { ScryfallClient } from "../utils/scryfall";
import { ScryfallSqliteCache } from "../utils/scryfallSqliteCache";

type ProcessDeckListInput = {
    name: string;
    link: string;
    primer: string;
    decklist: string;
};

const client = new ScryfallClient({ cache: new ScryfallSqliteCache() });
const keywordAbilities = KeywordAbilitiesJSON as KeywordAbilityList;
const counterTypes = CounterTypesJSON as CounterTypeList;
const keywordActions = KeywordActionsJSON as KeywordActionList;
const counterParser = new AhoCorasickNodeSearcher();
Object.keys(counterTypes).forEach((counter) => {
    counterParser.addSearchTerm(counter);
});

export const processDeckList = createServerFn({ method: "POST" })
    .inputValidator((data: ProcessDeckListInput) => data)
    .handler(async ({ data }) => {
        const { decklist } = data;
        const decklistEntries = parseDecklist(decklist);
        const { cards, notFound } = await client.getCardsByName(
            decklistEntries.map((entry) => entry.name),
        );
        if (notFound.length > 0) {
            console.warn(
                `The following cards were not found in Scryfall: ${notFound.join(", ")}`,
            );
        }
        const allKeywords = new Set<string>();
        for (const card of cards) {
            counterParser.search(card.oracle_text || "").forEach((result) => {
                allKeywords.add(result.value);
            });
            for (const keyword of client.getKeywords(card)) {
                allKeywords.add(keyword);
            }
        }

        console.info(
            `The following keywords were found in the decklist: ${[
                ...allKeywords,
            ].join(", ")}`,
        );

        for (const keyword of allKeywords) {
            // if keyword is in any of the lists, remove it from the set
            if (
                keyword in keywordAbilities ||
                keyword in counterTypes ||
                keyword in keywordActions
            ) {
                allKeywords.delete(keyword);
            }
        }

        console.info(
            `The following keywords were found in the decklist but not in the wiki data: ${[
                ...allKeywords,
            ].join(", ")}`,
        );
    });
