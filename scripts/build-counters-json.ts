import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";

const FULL_LIST_OF_COUNTERS_URL =
	"https://mtg.wiki/page/Counter_(marker)/Full_List";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/wiki/counters.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const COUNTER_IMPORTER_USER_AGENT = "mtg-keyword-codex/0.1 (counter-importer)";
const NETWORK_REQUEST_DELAY_MS = 150;
const JSON_INDENT_SPACES = 2;
const FOOTNOTE_REFERENCE_PATTERN = /\[\d+\]/g;
const WHITESPACE_PATTERN = /\s+/g;

type CounterLink = {
	counterName: string;
	counterUrl: string;
};

type CounterDetails = {
	intro: string;
	description: string;
	use: string;
	placedOn: string;
	sourceUrl: string;
};

type BuildResult = {
	counterDetailsByName: Record<string, CounterDetails>;
	completeCount: number;
	incompleteCounterReports: string[];
	duplicateCount: number;
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
	userAgent: COUNTER_IMPORTER_USER_AGENT,
	requestDelayMs: NETWORK_REQUEST_DELAY_MS,
});

/**
 * Runs the end-to-end counter import workflow and writes the output JSON.
 */
async function main(): Promise<void> {
	const fullListHtml = await fetchHtmlPage(FULL_LIST_OF_COUNTERS_URL);
	const counterLinks = collectCounterLinks(fullListHtml);

	if (counterLinks.length === 0) {
		throw new Error("Could not parse any counters from the full list page.");
	}

	const buildResult = await buildCounterDescriptions(counterLinks);
	await writeOutputJson(buildResult.counterDetailsByName);
	printSummary(counterLinks.length, buildResult);
}

/**
 * Fetches each counter page, extracts details, and builds summary stats.
 */
async function buildCounterDescriptions(
	counterLinks: CounterLink[],
): Promise<BuildResult> {
	const counterDetailsByName: Record<string, CounterDetails> = {};
	const incompleteCounterReports: string[] = [];
	const seenCounterNames = new Map<string, string>();
	let duplicateCount = 0;
	let completeCount = 0;

	for (const counterLink of counterLinks) {
		const normalizedCounterName = normalizeForCollision(
			counterLink.counterName,
		);
		const existingCounterName = seenCounterNames.get(normalizedCounterName);
		if (existingCounterName) {
			duplicateCount += 1;
			console.warn(
				`[duplicate] Skipping "${counterLink.counterName}" because "${existingCounterName}" was already processed.`,
			);
			continue;
		}

		seenCounterNames.set(normalizedCounterName, counterLink.counterName);

		try {
			const counterPageHtml = await fetchHtmlPage(counterLink.counterUrl);
			const counterDetails = extractCounterDetails(
				counterPageHtml,
				counterLink.counterUrl,
			);
			counterDetailsByName[counterLink.counterName] = counterDetails;

			const missingFields = findMissingFields(counterDetails);
			if (missingFields.length === 0) {
				completeCount += 1;
				continue;
			}

			console.warn(
				`[missing-fields] "${counterLink.counterName}" missing: ${missingFields.join(", ")} (${counterLink.counterUrl})`,
			);
			incompleteCounterReports.push(
				`${counterLink.counterName}: ${missingFields.join(", ")}`,
			);
		} catch (error) {
			console.warn(
				`[fetch-failed] Could not process "${counterLink.counterName}" (${counterLink.counterUrl}): ${toErrorMessage(error)}`,
			);
			counterDetailsByName[counterLink.counterName] = createEmptyCounterDetails(
				counterLink.counterUrl,
			);
			incompleteCounterReports.push(`${counterLink.counterName}: fetch failed`);
		}
	}

	return {
		counterDetailsByName,
		completeCount,
		incompleteCounterReports,
		duplicateCount,
	};
}

/**
 * Parses the full list page and returns candidate counter names and URLs.
 */
function collectCounterLinks(fullListHtml: string): CounterLink[] {
	const $ = load(fullListHtml);
	const anchorElements = $(`#mw-content-text div.hatnote a[title$="counter"]`);
	if (anchorElements.length === 0) {
		throw new Error("failed to find links!");
	}
	const counterLinks: CounterLink[] = [];
	for (const anchorElement of anchorElements.toArray()) {
		const cheerioAnchor = $(anchorElement);
		const counterName = normalizeWhiteSpace(cheerioAnchor.text());
		if (!isCounterName(counterName)) {
			throw new Error(`attempted to read the wrong link: ${counterName}`);
		}
		const counterUrl = resolveCounterUrl(cheerioAnchor.attr("href"));
		counterLinks.push({ counterName, counterUrl });
	}

	return counterLinks;
}

/**
 * Resolves and validates a wiki URL target from a link href.
 */
function resolveCounterUrl(hrefValue: string | undefined): string {
	if (!hrefValue || hrefValue.startsWith("#")) {
		throw new Error(`wrong link url! ${hrefValue}`);
	}

	const resolvedUrl = new URL(hrefValue, FULL_LIST_OF_COUNTERS_URL);
	resolvedUrl.hash = "";
	return resolvedUrl.toString();
}

/**
 * Extracts all supported fields for a counter from its page HTML.
 */
function extractCounterDetails(
	counterPageHtml: string,
	sourceUrl: string,
): CounterDetails {
	const $ = load(counterPageHtml);
	const introParagraphElement = $("#mw-content-text p:first-of-type");
	const intro = removeFootnotesAndNormalizeWhitespace(
		introParagraphElement.text(),
	);
	const infoBoxData = loadInfoBoxData($);
	return {
		intro,
		description: extractDescription($),
		use: infoBoxData.use ?? "",
		placedOn: infoBoxData["placed on"] ?? "",
		sourceUrl,
	};
}

/**
 * Extracts the Description section content from the page body.
 */
function extractDescription($: CheerioAPI): string {
	// return extractSectionText($, ["description"]);
	// find a h2 that has a child span with id "Description", then extract text until the next heading of any kind
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

function loadInfoBoxData($: CheerioAPI) {
	const infoBoxObj: Record<string, string> = {};
	const infoBoxRows = $("table.infobox tr");
	//if the row contains a th and a td, then we can assume it's a valid row
	for (const row of infoBoxRows.toArray()) {
		const rowElement = $(row);
		if (
			rowElement.find("th").length === 0 ||
			rowElement.find("td").length === 0
		) {
			continue;
		}

		const headerText = normalizeWhiteSpace(
			rowElement.find("th").first().text().toLowerCase(),
		);
		const valueText = removeFootnotesAndNormalizeWhitespace(
			rowElement.find("td").first().text(),
		);
		infoBoxObj[headerText] = valueText;
	}

	return infoBoxObj;
}

/**
 * Normalizes scraped field text and removes bracketed footnote references.
 */
function removeFootnotesAndNormalizeWhitespace(rawText: string): string {
	return normalizeWhiteSpace(
		rawText.replaceAll(FOOTNOTE_REFERENCE_PATTERN, ""),
	);
}

/**
 * Collapses whitespace and trims display text.
 */
function normalizeWhiteSpace(rawText: string): string {
	const NBSP_UNICODE = "\u00a0";
	return rawText
		.replaceAll(NBSP_UNICODE, " ")
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
 * Checks whether link text looks like a counter page name.
 */
function isCounterName(candidateName: string): boolean {
	const lowerCaseName = candidateName.toLowerCase();
	return lowerCaseName !== "counter" && lowerCaseName.endsWith(" counter");
}

/**
 * Normalizes a counter name for duplicate detection.
 */
function normalizeForCollision(counterName: string): string {
	return normalizeWhiteSpace(counterName).toLowerCase();
}

/**
 * Writes generated counter details to the output JSON file.
 */
async function writeOutputJson(
	counterDetailsByName: Record<string, CounterDetails>,
): Promise<void> {
	await mkdir(dirname(OUTPUT_FILE_PATH), { recursive: true });
	const jsonContent = `${JSON.stringify(counterDetailsByName, null, JSON_INDENT_SPACES)}\n`;
	await Bun.write(OUTPUT_FILE_PATH, jsonContent);
}

/**
 * Prints run statistics and incomplete-record details.
 */
function printSummary(discoveredCount: number, buildResult: BuildResult): void {
	console.log(`Generated ${OUTPUT_FILE_RELATIVE_PATH}`);
	console.log(`Discovered counter entries: ${discoveredCount}`);
	console.log(`Complete records: ${buildResult.completeCount}`);
	console.log(
		`Incomplete records: ${buildResult.incompleteCounterReports.length}`,
	);
	console.log(`Duplicates skipped: ${buildResult.duplicateCount}`);

	if (buildResult.incompleteCounterReports.length > 0) {
		console.log("Incomplete counter reports:");
		for (const incompleteCounterReport of buildResult.incompleteCounterReports) {
			console.log(`- ${incompleteCounterReport}`);
		}
	}
}

/**
 * Lists counter detail fields that are still empty.
 */
function findMissingFields(
	counterDetails: CounterDetails,
): Array<keyof CounterDetails> {
	const missingFields: Array<keyof CounterDetails> = [];
	const fieldNames = Object.keys(counterDetails) as Array<keyof CounterDetails>;
	for (const fieldName of fieldNames) {
		if (counterDetails[fieldName].length === 0) {
			missingFields.push(fieldName);
		}
	}

	return missingFields;
}

/**
 * Creates an empty counter-details object for failed fetches.
 */
function createEmptyCounterDetails(sourceUrl: string): CounterDetails {
	return {
		intro: "",
		description: "",
		use: "",
		placedOn: "",
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

main().catch((error) => {
	console.error(`Counter generation failed: ${toErrorMessage(error)}`);
	process.exit(1);
});
