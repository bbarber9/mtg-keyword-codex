import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";
import {
	extractSectionTextByHeadingId,
	extractTextIncludingImageAlt,
	findMissingFields,
	loadInfoBoxData,
	normalizeForCollision,
	normalizeWhiteSpace,
	removeFootnotesAndNormalizeWhitespace,
	toErrorMessage,
	writeJsonFile,
} from "./wiki-scrape-utils";

const FULL_LIST_OF_COUNTERS_URL =
	"https://mtg.wiki/page/Counter_(marker)/Full_List";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/wiki/counters.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const COUNTER_IMPORTER_USER_AGENT =
	"mtg-keyword-cheatsheet/0.1 (counter-importer)";
const NETWORK_REQUEST_DELAY_MS = 150;
const IGNORE_WIKI_CACHE = process.argv.includes("--ignore-cache");
const INFOBOX_USE_FIELD_NAMES = [
	"use",
	"typical use",
	"reminder text",
] as const;

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
	ignoreCache: IGNORE_WIKI_CACHE,
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
	await writeJsonFile(OUTPUT_FILE_PATH, buildResult.counterDetailsByName);
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
export function extractCounterDetails(
	counterPageHtml: string,
	sourceUrl: string,
): CounterDetails {
	const $ = load(counterPageHtml);
	const introParagraphElement = $("#mw-content-text p:first-of-type");
	const intro = normalizeScrapedText(
		extractTextIncludingImageAlt($, introParagraphElement),
	);
	const infoBoxData = loadInfoBoxData($, normalizeScrapedText);
	return {
		intro,
		description: extractDescription($),
		use: getFirstInfoBoxValue(infoBoxData, INFOBOX_USE_FIELD_NAMES),
		placedOn: infoBoxData["placed on"] ?? "",
		sourceUrl,
	};
}

function getFirstInfoBoxValue(
	infoBoxData: Record<string, string>,
	fieldNames: readonly string[],
): string {
	for (const fieldName of fieldNames) {
		const fieldValue = infoBoxData[fieldName];
		if (fieldValue) {
			return fieldValue;
		}
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
	return removeFootnotesAndNormalizeWhitespace(rawText);
}

/**
 * Checks whether link text looks like a counter page name.
 */
function isCounterName(candidateName: string): boolean {
	const lowerCaseName = candidateName.toLowerCase();
	return lowerCaseName !== "counter" && lowerCaseName.endsWith(" counter");
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

// Only run the generator when this file is executed as a script. Tests import
// parser helpers from this file, and those imports should not fetch wiki pages
// or write the generated JSON file.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
	main().catch((error) => {
		console.error(`Counter generation failed: ${toErrorMessage(error)}`);
		process.exit(1);
	});
}
