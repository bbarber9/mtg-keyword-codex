import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";

const KEYWORD_ACTIONS_PAGE_URL = "https://mtg.wiki/page/Keyword_action";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/wiki/keyword-actions.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const KEYWORD_ACTION_IMPORTER_USER_AGENT =
	"mtg-keyword-codex/0.1 (keyword-action-importer)";
const NETWORK_REQUEST_DELAY_MS = 150;
const JSON_INDENT_SPACES = 2;
const FOOTNOTE_REFERENCE_PATTERN = /\[\d+\]/g;
const WHITESPACE_PATTERN = /\s+/g;
const SPACE_BEFORE_PUNCTUATION_PATTERN = /\s+([,.;:!?])/g;
const RULE_NUMBER_PATTERN = /^701\.(\d+)\./;
const MINIMUM_KEYWORD_ACTION_RULE_NUMBER = 2;

type KeywordActionLink = {
	keywordActionName: string;
	keywordActionUrl: string;
};

type KeywordActionDetails = {
	intro: string;
	description: string;
	reminderText: string;
	sourceUrl: string;
};

type BuildResult = {
	keywordActionDetailsByName: Record<string, KeywordActionDetails>;
	completeCount: number;
	incompleteKeywordActionReports: string[];
	duplicateCount: number;
	fetchFailureCount: number;
};

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY_PATH = dirname(SCRIPT_FILE_PATH);
const PROJECT_ROOT_PATH = resolve(SCRIPT_DIRECTORY_PATH, "..");
const OUTPUT_FILE_PATH = resolve(PROJECT_ROOT_PATH, OUTPUT_FILE_RELATIVE_PATH);
const WIKI_CACHE_DIRECTORY_PATH = resolve(
	PROJECT_ROOT_PATH,
	WIKI_CACHE_DIRECTORY_RELATIVE_PATH,
);

const fetchHtmlPage = createWikiHtmlPageFetcher({
	cacheDirectoryPath: WIKI_CACHE_DIRECTORY_PATH,
	userAgent: KEYWORD_ACTION_IMPORTER_USER_AGENT,
	requestDelayMs: NETWORK_REQUEST_DELAY_MS,
});

/**
 * Runs the end-to-end keyword action import workflow and writes the output JSON.
 */
async function main(): Promise<void> {
	const keywordActionsPageHtml = await fetchHtmlPage(KEYWORD_ACTIONS_PAGE_URL);
	const keywordActionLinks = collectKeywordActionLinks(keywordActionsPageHtml);
	if (keywordActionLinks.length === 0) {
		throw new Error(
			"Could not parse any keyword actions from the keyword action page.",
		);
	}

	const buildResult = await buildKeywordActionDetails(keywordActionLinks);
	await writeOutputJson(buildResult.keywordActionDetailsByName);
	printSummary(keywordActionLinks.length, buildResult);
}

/**
 * Parses the keyword action rules section and returns keyword-action names/URLs.
 */
export function collectKeywordActionLinks(
	keywordActionsPageHtml: string,
): KeywordActionLink[] {
	const $ = load(keywordActionsPageHtml);
	const rulesSectionHeadingElement = $("#Rules").closest("h2");
	if (rulesSectionHeadingElement.length === 0) {
		throw new Error("Could not locate the Rules section heading.");
	}

	const rulesSectionElements = rulesSectionHeadingElement.nextUntil("h2");
	if (rulesSectionElements.length === 0) {
		throw new Error("Could not locate content inside the Rules section.");
	}

	const comprehensiveRulesContainerElement = selectComprehensiveRulesContainer(
		$,
		rulesSectionElements,
	);
	const candidateRuleListItems = collectCandidateRuleListItems(
		comprehensiveRulesContainerElement,
	);

	const keywordActionLinks: KeywordActionLink[] = [];
	for (const candidateRuleListItem of candidateRuleListItems.toArray()) {
		const candidateRuleListItemElement = $(candidateRuleListItem);
		const candidateRuleText = normalizeWhiteSpace(
			candidateRuleListItemElement.text(),
		);
		if (!isKeywordActionRuleListItem(candidateRuleText)) {
			continue;
		}

		const firstRuleLinkElement = candidateRuleListItemElement
			.find("a[href]")
			.first();
		if (firstRuleLinkElement.length === 0) {
			continue;
		}

		const keywordActionName = normalizeWhiteSpace(firstRuleLinkElement.text());
		if (keywordActionName.length === 0) {
			continue;
		}

		const keywordActionUrl = resolveKeywordActionUrl(
			firstRuleLinkElement.attr("href"),
		);
		keywordActionLinks.push({
			keywordActionName,
			keywordActionUrl,
		});
	}

	if (keywordActionLinks.length === 0) {
		throw new Error("No keyword-action links were found under rules section.");
	}

	return keywordActionLinks;
}

/**
 * Picks the CR block used on the keyword action page.
 */
function selectComprehensiveRulesContainer(
	$: CheerioAPI,
	rulesSectionElements: ReturnType<CheerioAPI>,
): ReturnType<CheerioAPI> {
	const comprehensiveRulesContainerElement = rulesSectionElements
		.filter((_, element) => $(element).hasClass("crDiv"))
		.first();
	if (comprehensiveRulesContainerElement.length > 0) {
		return comprehensiveRulesContainerElement;
	}

	return rulesSectionElements;
}

/**
 * Collects candidate list items that may contain 701.x rule entries.
 */
function collectCandidateRuleListItems(
	comprehensiveRulesContainerElement: ReturnType<CheerioAPI>,
): ReturnType<CheerioAPI> {
	const nestedRuleListItems =
		comprehensiveRulesContainerElement.find("ul > li > ul > li");
	if (nestedRuleListItems.length > 0) {
		return nestedRuleListItems;
	}

	return comprehensiveRulesContainerElement.find("li");
}

/**
 * Checks whether a list item text represents a 701.x keyword action rule.
 */
function isKeywordActionRuleListItem(candidateRuleText: string): boolean {
	const ruleNumberMatch = RULE_NUMBER_PATTERN.exec(candidateRuleText);
	if (!ruleNumberMatch) {
		return false;
	}

	const parsedRuleNumber = Number.parseInt(ruleNumberMatch[1], 10);
	return (
		!Number.isNaN(parsedRuleNumber) &&
		parsedRuleNumber >= MINIMUM_KEYWORD_ACTION_RULE_NUMBER
	);
}

/**
 * Resolves and validates a keyword action URL from a link href.
 */
function resolveKeywordActionUrl(hrefValue: string | undefined): string {
	if (!hrefValue || hrefValue.startsWith("#")) {
		throw new Error(`Invalid keyword action link href: ${hrefValue}`);
	}

	const resolvedUrl = new URL(hrefValue, KEYWORD_ACTIONS_PAGE_URL);
	resolvedUrl.hash = "";
	return resolvedUrl.toString();
}

/**
 * Fetches each keyword-action page, extracts details, and builds summary stats.
 */
async function buildKeywordActionDetails(
	keywordActionLinks: KeywordActionLink[],
): Promise<BuildResult> {
	const keywordActionDetailsByName: Record<string, KeywordActionDetails> = {};
	const incompleteKeywordActionReports: string[] = [];
	const seenKeywordActionNames = new Map<string, string>();
	let duplicateCount = 0;
	let completeCount = 0;
	let fetchFailureCount = 0;

	for (const keywordActionLink of keywordActionLinks) {
		const normalizedKeywordActionName = normalizeForCollision(
			keywordActionLink.keywordActionName,
		);
		const existingKeywordActionName = seenKeywordActionNames.get(
			normalizedKeywordActionName,
		);
		if (existingKeywordActionName) {
			duplicateCount += 1;
			console.warn(
				`[duplicate] Skipping "${keywordActionLink.keywordActionName}" because "${existingKeywordActionName}" was already processed.`,
			);
			continue;
		}

		seenKeywordActionNames.set(
			normalizedKeywordActionName,
			keywordActionLink.keywordActionName,
		);

		try {
			const keywordActionPageHtml = await fetchHtmlPage(
				keywordActionLink.keywordActionUrl,
			);
			const keywordActionDetails = extractKeywordActionDetails(
				keywordActionPageHtml,
				keywordActionLink.keywordActionUrl,
			);
			keywordActionDetailsByName[keywordActionLink.keywordActionName] =
				keywordActionDetails;

			const missingFields = findMissingFields(keywordActionDetails);
			if (missingFields.length === 0) {
				completeCount += 1;
				continue;
			}

			console.warn(
				`[missing-fields] "${keywordActionLink.keywordActionName}" missing: ${missingFields.join(", ")} (${keywordActionLink.keywordActionUrl})`,
			);
			incompleteKeywordActionReports.push(
				`${keywordActionLink.keywordActionName}: ${missingFields.join(", ")}`,
			);
		} catch (error) {
			fetchFailureCount += 1;
			console.warn(
				`[fetch-failed] Could not process "${keywordActionLink.keywordActionName}" (${keywordActionLink.keywordActionUrl}): ${toErrorMessage(error)}`,
			);
			keywordActionDetailsByName[keywordActionLink.keywordActionName] =
				createEmptyKeywordActionDetails(keywordActionLink.keywordActionUrl);
			incompleteKeywordActionReports.push(
				`${keywordActionLink.keywordActionName}: fetch failed`,
			);
		}
	}

	return {
		keywordActionDetailsByName,
		completeCount,
		incompleteKeywordActionReports,
		duplicateCount,
		fetchFailureCount,
	};
}

/**
 * Extracts all supported fields for a keyword action from a page HTML document.
 */
export function extractKeywordActionDetails(
	keywordActionPageHtml: string,
	sourceUrl: string,
): KeywordActionDetails {
	const $ = load(keywordActionPageHtml);
	const infoBoxData = loadInfoBoxData($);

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
		const intro = removeFootnotesAndNormalizeWhitespace(
			introParagraphElement.text(),
		);

		return intro;
	}
	return "";
}

/**
 * Extracts the Description section content from the page body.
 */
function extractDescription($: CheerioAPI): string {
	const descriptionSpan = $("h2 span#Description").first();
	if (descriptionSpan.length === 0) {
		return "";
	}

	const descriptionHeading = descriptionSpan.parent("h2").first();
	if (descriptionHeading.length === 0) {
		return "";
	}

	let currentElement = descriptionHeading.next();
	const descriptionChunks: string[] = [];
	while (currentElement.length > 0) {
		const tagName = getElementTagName(currentElement);
		if (isHeadingTag(tagName)) {
			break;
		}

		if (isTextContentTag(tagName)) {
			const textChunk = removeFootnotesAndNormalizeWhitespace(
				currentElement.text(),
			);
			if (textChunk.length > 0) {
				descriptionChunks.push(textChunk);
			}
		}

		currentElement = currentElement.next();
	}

	return descriptionChunks.join("\n\n");
}

/**
 * Reads infobox key-value rows into a normalized lookup object.
 */
function loadInfoBoxData($: CheerioAPI): Record<string, string> {
	const infoBoxData: Record<string, string> = {};
	const infoBoxRows = $("table.infobox tr");
	for (const infoBoxRow of infoBoxRows.toArray()) {
		const infoBoxRowElement = $(infoBoxRow);
		if (
			infoBoxRowElement.find("th").length === 0 ||
			infoBoxRowElement.find("td").length === 0
		) {
			continue;
		}

		const headerText = normalizeWhiteSpace(
			infoBoxRowElement.find("th").first().text().toLowerCase(),
		);
		const valueText = removeFootnotesAndNormalizeWhitespace(
			infoBoxRowElement.find("td").first().text(),
		);
		infoBoxData[headerText] = valueText;
	}

	return infoBoxData;
}

/**
 * Normalizes scraped field text and removes bracketed footnote references.
 */
function removeFootnotesAndNormalizeWhitespace(rawText: string): string {
	const textWithoutFootnotes = rawText.replaceAll(
		FOOTNOTE_REFERENCE_PATTERN,
		"",
	);
	return normalizeWhiteSpace(textWithoutFootnotes).replaceAll(
		SPACE_BEFORE_PUNCTUATION_PATTERN,
		"$1",
	);
}

/**
 * Collapses whitespace and trims display text.
 */
function normalizeWhiteSpace(rawText: string): string {
	const nonBreakingSpaceUnicode = "\u00a0";
	return rawText
		.replaceAll(nonBreakingSpaceUnicode, " ")
		.replaceAll(WHITESPACE_PATTERN, " ")
		.trim();
}

/**
 * Returns a lowercase tag name for a Cheerio element.
 */
function getElementTagName(element: ReturnType<CheerioAPI>): string {
	const tagName = element.prop("tagName");
	return typeof tagName === "string" ? tagName.toLowerCase() : "";
}

/**
 * Checks whether a tag name is an h2-h6 heading.
 */
function isHeadingTag(tagName: string): boolean {
	return (
		tagName === "h2" ||
		tagName === "h3" ||
		tagName === "h4" ||
		tagName === "h5" ||
		tagName === "h6"
	);
}

/**
 * Checks whether an element tag should be included in section text.
 */
function isTextContentTag(tagName: string): boolean {
	return (
		tagName === "p" ||
		tagName === "ul" ||
		tagName === "ol" ||
		tagName === "dl" ||
		tagName === "blockquote"
	);
}

/**
 * Normalizes a keyword-action name for duplicate detection.
 */
export function normalizeForCollision(keywordActionName: string): string {
	return normalizeWhiteSpace(keywordActionName).toLowerCase();
}

/**
 * Writes generated keyword-action details to the output JSON file.
 */
async function writeOutputJson(
	keywordActionDetailsByName: Record<string, KeywordActionDetails>,
): Promise<void> {
	await mkdir(dirname(OUTPUT_FILE_PATH), { recursive: true });
	const jsonContent = `${JSON.stringify(keywordActionDetailsByName, null, JSON_INDENT_SPACES)}\n`;
	await Bun.write(OUTPUT_FILE_PATH, jsonContent);
}

/**
 * Prints run statistics and incomplete-record details.
 */
function printSummary(discoveredCount: number, buildResult: BuildResult): void {
	console.log(`Generated ${OUTPUT_FILE_RELATIVE_PATH}`);
	console.log(`Discovered keyword action entries: ${discoveredCount}`);
	console.log(`Complete records: ${buildResult.completeCount}`);
	console.log(
		`Incomplete records: ${buildResult.incompleteKeywordActionReports.length}`,
	);
	console.log(`Duplicates skipped: ${buildResult.duplicateCount}`);
	console.log(`Fetch failures: ${buildResult.fetchFailureCount}`);

	if (buildResult.incompleteKeywordActionReports.length > 0) {
		console.log("Incomplete keyword action reports:");
		for (const incompleteKeywordActionReport of buildResult.incompleteKeywordActionReports) {
			console.log(`- ${incompleteKeywordActionReport}`);
		}
	}
}

/**
 * Lists keyword-action detail fields that are still empty.
 */
function findMissingFields(
	keywordActionDetails: KeywordActionDetails,
): Array<keyof KeywordActionDetails> {
	const missingFields: Array<keyof KeywordActionDetails> = [];
	const fieldNames = Object.keys(keywordActionDetails) as Array<
		keyof KeywordActionDetails
	>;
	for (const fieldName of fieldNames) {
		if (keywordActionDetails[fieldName].length === 0) {
			missingFields.push(fieldName);
		}
	}

	return missingFields;
}

/**
 * Creates an empty keyword-action details object for failed fetches.
 */
function createEmptyKeywordActionDetails(
	sourceUrl: string,
): KeywordActionDetails {
	return {
		intro: "",
		description: "",
		reminderText: "",
		sourceUrl,
	};
}

/**
 * Converts unknown thrown values into readable error text.
 */
function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(`Keyword action generation failed: ${toErrorMessage(error)}`);
		process.exit(1);
	});
}
