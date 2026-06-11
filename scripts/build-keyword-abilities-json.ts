import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import {
	applyKeywordAliases,
	type KeywordAliasMap,
	loadKeywordAliasesFromFile,
	SHARED_KEYWORD_ALIAS_FILE_RELATIVE_PATH,
} from "./keyword-alias-utils";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";
import {
	extractSectionTextByHeadingId,
	extractTextIncludingImageAlt,
	findMissingFields,
	loadInfoBoxData,
	normalizeForCollision as normalizeNameForCollision,
	normalizeWhiteSpace,
	removeFootnotesAndNormalizeWhitespace,
	toErrorMessage,
	writeJsonFile,
} from "./wiki-scrape-utils";

const KEYWORD_ABILITIES_PAGE_URL = "https://mtg.wiki/page/Keyword_ability";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/wiki/keyword-abilities.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const KEYWORD_ABILITY_IMPORTER_USER_AGENT =
	"mtg-keyword-cheatsheet/0.1 (keyword-ability-importer)";
const NETWORK_REQUEST_DELAY_MS = 150;
const RULE_NUMBER_PATTERN = /^702\.(\d+)\./;
const MINIMUM_KEYWORD_ABILITY_RULE_NUMBER = 2;

type KeywordAbilityLink = {
	keywordAbilityName: string;
	keywordAbilityUrl: string;
};

type KeywordAbilityDetails = {
	intro: string;
	description: string;
	reminderText: string;
	sourceUrl: string;
};

type BuildResult = {
	keywordAbilityDetailsByName: Record<string, KeywordAbilityDetails>;
	completeCount: number;
	incompleteKeywordAbilityReports: string[];
	duplicateCount: number;
	fetchFailureCount: number;
	aliasCount: number;
};

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY_PATH = dirname(SCRIPT_FILE_PATH);
const PROJECT_ROOT_PATH = resolve(SCRIPT_DIRECTORY_PATH, "..");
const OUTPUT_FILE_PATH = resolve(PROJECT_ROOT_PATH, OUTPUT_FILE_RELATIVE_PATH);
const ALIAS_MAP_FILE_PATH = resolve(
	PROJECT_ROOT_PATH,
	SHARED_KEYWORD_ALIAS_FILE_RELATIVE_PATH,
);
const WIKI_CACHE_DIRECTORY_PATH = resolve(
	PROJECT_ROOT_PATH,
	WIKI_CACHE_DIRECTORY_RELATIVE_PATH,
);

const fetchHtmlPage = createWikiHtmlPageFetcher({
	cacheDirectoryPath: WIKI_CACHE_DIRECTORY_PATH,
	userAgent: KEYWORD_ABILITY_IMPORTER_USER_AGENT,
	requestDelayMs: NETWORK_REQUEST_DELAY_MS,
});

/**
 * Runs the end-to-end keyword ability import workflow and writes the output JSON.
 */
async function main(): Promise<void> {
	const keywordAbilityAliases = await loadKeywordAbilityAliases();
	const keywordAbilitiesPageHtml = await fetchHtmlPage(
		KEYWORD_ABILITIES_PAGE_URL,
	);
	const keywordAbilityLinks = collectKeywordAbilityLinks(
		keywordAbilitiesPageHtml,
	);
	if (keywordAbilityLinks.length === 0) {
		throw new Error(
			"Could not parse any keyword abilities from the keyword ability page.",
		);
	}

	const buildResult = await buildKeywordAbilityDetails(
		keywordAbilityLinks,
		keywordAbilityAliases,
	);
	await writeJsonFile(
		OUTPUT_FILE_PATH,
		buildResult.keywordAbilityDetailsByName,
	);
	printSummary(keywordAbilityLinks.length, buildResult);
}

/**
 * Parses the keyword ability rules section and returns ability names and URLs.
 */
export function collectKeywordAbilityLinks(
	keywordAbilitiesPageHtml: string,
): KeywordAbilityLink[] {
	const $ = load(keywordAbilitiesPageHtml);
	const rulesSectionHeadingElement = $("#Rules").closest("h2");
	if (rulesSectionHeadingElement.length === 0) {
		throw new Error("Could not locate the Rules section heading.");
	}

	const rulesSectionElements = rulesSectionHeadingElement.nextUntil("h2");
	if (rulesSectionElements.length === 0) {
		throw new Error("Could not locate content inside the Rules section.");
	}

	const comprehensiveRulesContainerElement = rulesSectionElements
		.filter((_, element) => $(element).hasClass("crDiv"))
		.last();
	if (comprehensiveRulesContainerElement.length === 0) {
		throw new Error(
			"Could not locate the comprehensive rules block in the Rules section.",
		);
	}

	const candidateRuleListItems = comprehensiveRulesContainerElement.find("li");
	if (candidateRuleListItems.length === 0) {
		throw new Error(
			"Could not locate rule list items in the comprehensive rules block.",
		);
	}

	const keywordAbilityLinks: KeywordAbilityLink[] = [];
	for (const candidateRuleListItem of candidateRuleListItems.toArray()) {
		const candidateRuleListItemElement = $(candidateRuleListItem);
		const candidateRuleText = normalizeWhiteSpace(
			candidateRuleListItemElement.text(),
		);
		if (!isKeywordAbilityRuleListItem(candidateRuleText)) {
			continue;
		}

		const firstRuleLinkElement = candidateRuleListItemElement
			.find("a[href]")
			.first();
		if (firstRuleLinkElement.length === 0) {
			continue;
		}

		const keywordAbilityName = normalizeWhiteSpace(firstRuleLinkElement.text());
		if (keywordAbilityName.length === 0) {
			continue;
		}

		const keywordAbilityUrl = resolveKeywordAbilityUrl(
			firstRuleLinkElement.attr("href"),
		);
		keywordAbilityLinks.push({
			keywordAbilityName,
			keywordAbilityUrl,
		});
	}

	if (keywordAbilityLinks.length === 0) {
		throw new Error("No keyword-ability links were found under rules section.");
	}

	return keywordAbilityLinks;
}

/**
 * Checks whether a list item text represents a 702.x keyword ability rule.
 */
function isKeywordAbilityRuleListItem(candidateRuleText: string): boolean {
	const ruleNumberMatch = RULE_NUMBER_PATTERN.exec(candidateRuleText);
	if (!ruleNumberMatch) {
		return false;
	}

	const parsedRuleNumber = Number.parseInt(ruleNumberMatch[1], 10);
	return (
		!Number.isNaN(parsedRuleNumber) &&
		parsedRuleNumber >= MINIMUM_KEYWORD_ABILITY_RULE_NUMBER
	);
}

/**
 * Resolves and validates a keyword ability URL from a link href.
 */
function resolveKeywordAbilityUrl(hrefValue: string | undefined): string {
	if (!hrefValue || hrefValue.startsWith("#")) {
		throw new Error(`Invalid keyword ability link href: ${hrefValue}`);
	}

	const resolvedUrl = new URL(hrefValue, KEYWORD_ABILITIES_PAGE_URL);
	resolvedUrl.hash = "";
	return resolvedUrl.toString();
}

/**
 * Fetches each keyword-ability page, extracts details, and builds summary stats.
 */
async function buildKeywordAbilityDetails(
	keywordAbilityLinks: KeywordAbilityLink[],
	keywordAbilityAliases: KeywordAliasMap = {},
): Promise<BuildResult> {
	const keywordAbilityDetailsByName: Record<string, KeywordAbilityDetails> = {};
	const incompleteKeywordAbilityReports: string[] = [];
	const seenKeywordAbilityNames = new Map<string, string>();
	let duplicateCount = 0;
	let completeCount = 0;
	let fetchFailureCount = 0;

	for (const keywordAbilityLink of keywordAbilityLinks) {
		const normalizedKeywordAbilityName = normalizeForCollision(
			keywordAbilityLink.keywordAbilityName,
		);
		const existingKeywordAbilityName = seenKeywordAbilityNames.get(
			normalizedKeywordAbilityName,
		);
		if (existingKeywordAbilityName) {
			duplicateCount += 1;
			console.warn(
				`[duplicate] Skipping "${keywordAbilityLink.keywordAbilityName}" because "${existingKeywordAbilityName}" was already processed.`,
			);
			continue;
		}

		seenKeywordAbilityNames.set(
			normalizedKeywordAbilityName,
			keywordAbilityLink.keywordAbilityName,
		);

		try {
			const keywordAbilityPageHtml = await fetchHtmlPage(
				keywordAbilityLink.keywordAbilityUrl,
			);
			const keywordAbilityDetails = extractKeywordAbilityDetails(
				keywordAbilityPageHtml,
				keywordAbilityLink.keywordAbilityUrl,
			);
			keywordAbilityDetailsByName[keywordAbilityLink.keywordAbilityName] =
				keywordAbilityDetails;

			const missingFields = findMissingFields(keywordAbilityDetails);
			if (missingFields.length === 0) {
				completeCount += 1;
				continue;
			}

			console.warn(
				`[missing-fields] "${keywordAbilityLink.keywordAbilityName}" missing: ${missingFields.join(", ")} (${keywordAbilityLink.keywordAbilityUrl})`,
			);
			incompleteKeywordAbilityReports.push(
				`${keywordAbilityLink.keywordAbilityName}: ${missingFields.join(", ")}`,
			);
		} catch (error) {
			fetchFailureCount += 1;
			console.warn(
				`[fetch-failed] Could not process "${keywordAbilityLink.keywordAbilityName}" (${keywordAbilityLink.keywordAbilityUrl}): ${toErrorMessage(error)}`,
			);
			keywordAbilityDetailsByName[keywordAbilityLink.keywordAbilityName] =
				createEmptyKeywordAbilityDetails(keywordAbilityLink.keywordAbilityUrl);
			incompleteKeywordAbilityReports.push(
				`${keywordAbilityLink.keywordAbilityName}: fetch failed`,
			);
		}
	}

	const aliasedKeywordAbilityDetailsByName = applyKeywordAbilityAliases(
		keywordAbilityDetailsByName,
		keywordAbilityAliases,
	);

	return {
		keywordAbilityDetailsByName: aliasedKeywordAbilityDetailsByName,
		completeCount,
		incompleteKeywordAbilityReports,
		duplicateCount,
		fetchFailureCount,
		aliasCount:
			Object.keys(aliasedKeywordAbilityDetailsByName).length -
			Object.keys(keywordAbilityDetailsByName).length,
	};
}

/**
 * Extracts all supported fields for a keyword ability from a page HTML document.
 */
export function extractKeywordAbilityDetails(
	keywordAbilityPageHtml: string,
	sourceUrl: string,
): KeywordAbilityDetails {
	const $ = load(keywordAbilityPageHtml);
	const infoBoxData = loadInfoBoxData($, normalizeScrapedText);

	return {
		intro: extractIntro($),
		description: extractDescription($),
		reminderText: infoBoxData["reminder text"] ?? "",
		sourceUrl,
	};
}

/**
 * Extracts the first non-empty intro paragraph in the page body.
 */
function extractIntro($: CheerioAPI): string {
	const introParagraphElement = $(
		"#mw-content-text .mw-parser-output p",
	).first();
	if (introParagraphElement.length !== 0) {
		const intro = normalizeScrapedText(
			extractTextIncludingImageAlt($, introParagraphElement),
		);

		return intro;
	}
	return "";
}

/**
 * Extracts the Description section content from the page body.
 */
function extractDescription($: CheerioAPI): string {
	return extractSectionTextByHeadingId($, "Description", normalizeScrapedText);
}

function normalizeScrapedText(rawText: string): string {
	return removeFootnotesAndNormalizeWhitespace(rawText, {
		normalizeSpaceBeforePunctuation: true,
	});
}

/**
 * Normalizes a keyword-ability name for duplicate detection.
 */
export function normalizeForCollision(keywordAbilityName: string): string {
	return normalizeNameForCollision(keywordAbilityName);
}

/**
 * Loads the checked-in keyword ability alias map.
 */
async function loadKeywordAbilityAliases(): Promise<KeywordAliasMap> {
	return loadKeywordAliasesFromFile({
		aliasFilePath: ALIAS_MAP_FILE_PATH,
		collisionNormalizer: normalizeForCollision,
		entityLabel: "Keyword ability",
		normalizeDisplayName: normalizeWhiteSpace,
	});
}

export function applyKeywordAbilityAliases(
	keywordAbilityDetailsByName: Record<string, KeywordAbilityDetails>,
	keywordAbilityAliases: KeywordAliasMap,
): Record<string, KeywordAbilityDetails> {
	return applyKeywordAliases({
		aliasesByName: keywordAbilityAliases,
		canonicalRecordsByName: keywordAbilityDetailsByName,
		collisionNormalizer: normalizeForCollision,
		entityLabel: "Keyword ability",
		normalizeDisplayName: normalizeWhiteSpace,
	});
}

/**
 * Prints run statistics and incomplete-record details.
 */
function printSummary(discoveredCount: number, buildResult: BuildResult): void {
	console.log(`Generated ${OUTPUT_FILE_RELATIVE_PATH}`);
	console.log(`Discovered keyword ability entries: ${discoveredCount}`);
	console.log(`Complete records: ${buildResult.completeCount}`);
	console.log(
		`Incomplete records: ${buildResult.incompleteKeywordAbilityReports.length}`,
	);
	console.log(`Duplicates skipped: ${buildResult.duplicateCount}`);
	console.log(`Fetch failures: ${buildResult.fetchFailureCount}`);
	console.log(`Aliases added: ${buildResult.aliasCount}`);

	if (buildResult.incompleteKeywordAbilityReports.length > 0) {
		console.log("Incomplete keyword ability reports:");
		for (const incompleteKeywordAbilityReport of buildResult.incompleteKeywordAbilityReports) {
			console.log(`- ${incompleteKeywordAbilityReport}`);
		}
	}
}

/**
 * Creates an empty keyword-ability details object for failed fetches.
 */
function createEmptyKeywordAbilityDetails(
	sourceUrl: string,
): KeywordAbilityDetails {
	return {
		intro: "",
		description: "",
		reminderText: "",
		sourceUrl,
	};
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`Keyword ability generation failed: ${toErrorMessage(error)}`,
		);
		process.exit(1);
	});
}
