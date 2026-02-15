import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";

const KEYWORD_ACTION_ROOT_URL = "https://mtg.wiki/page/Keyword_action";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/wiki/keyword-actions.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const KEYWORD_ACTION_IMPORTER_USER_AGENT =
	"mtg-keyword-codex/0.1 (keyword-action-importer)";
const NETWORK_REQUEST_DELAY_MS = 150;
const JSON_INDENT_SPACES = 2;
const FOOTNOTE_REFERENCE_PATTERN = /\[\d+\]/g;
const RULES_SECTION_HEADING_LABEL = "rules";
const RULE_ENTRY_PREFIX_PATTERN = /^701\.\d+\.\s+/;
const WHITESPACE_PATTERN = /\s+/g;

type KeywordActionLink = {
	actionName: string;
	actionUrl: string;
};

type KeywordActionDetails = {
	intro: string;
	description: string;
	reminderText: string;
	sourceUrl: string;
};

type BuildResult = {
	actionDetailsByName: Record<string, KeywordActionDetails>;
	completeCount: number;
	incompleteActionReports: string[];
	duplicateCount: number;
};

type InfoboxFieldOptions = {
	rowLabels: string[];
	dataSources: string[];
	allowContainsMatch?: boolean;
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
 * Runs the end-to-end keyword-action import workflow and writes output JSON.
 */
async function main(): Promise<void> {
	const keywordActionRootHtml = await fetchHtmlPage(KEYWORD_ACTION_ROOT_URL);
	const keywordActionLinks = collectKeywordActionLinks(keywordActionRootHtml);

	if (keywordActionLinks.length === 0) {
		throw new Error("Could not parse any keyword actions from the root page.");
	}

	const buildResult = await buildKeywordActionDetails(keywordActionLinks);
	await writeOutputJson(buildResult.actionDetailsByName);
	printSummary(keywordActionLinks.length, buildResult);
}

/**
 * Fetches each keyword-action page, extracts details, and builds summary stats.
 */
async function buildKeywordActionDetails(
	keywordActionLinks: KeywordActionLink[],
): Promise<BuildResult> {
	const actionDetailsByName: Record<string, KeywordActionDetails> = {};
	const incompleteActionReports: string[] = [];
	const seenActionNames = new Map<string, string>();
	let duplicateCount = 0;
	let completeCount = 0;

	for (const keywordActionLink of keywordActionLinks) {
		const normalizedActionName = normalizeForCollision(keywordActionLink.actionName);
		const existingActionName = seenActionNames.get(normalizedActionName);
		if (existingActionName) {
			duplicateCount += 1;
			console.warn(
				`[duplicate] Skipping "${keywordActionLink.actionName}" because "${existingActionName}" was already processed.`,
			);
			continue;
		}

		seenActionNames.set(normalizedActionName, keywordActionLink.actionName);

		try {
			const actionPageHtml = await fetchHtmlPage(keywordActionLink.actionUrl);
			const actionDetails = extractKeywordActionDetails(
				actionPageHtml,
				keywordActionLink.actionUrl,
			);
			actionDetailsByName[keywordActionLink.actionName] = actionDetails;

			const missingFields = findMissingFields(actionDetails);
			if (missingFields.length === 0) {
				completeCount += 1;
				continue;
			}

			console.warn(
				`[missing-fields] "${keywordActionLink.actionName}" missing: ${missingFields.join(", ")} (${keywordActionLink.actionUrl})`,
			);
			incompleteActionReports.push(
				`${keywordActionLink.actionName}: ${missingFields.join(", ")}`,
			);
		} catch (error) {
			console.warn(
				`[fetch-failed] Could not process "${keywordActionLink.actionName}" (${keywordActionLink.actionUrl}): ${toErrorMessage(error)}`,
			);
			actionDetailsByName[keywordActionLink.actionName] =
				createEmptyKeywordActionDetails(keywordActionLink.actionUrl);
			incompleteActionReports.push(`${keywordActionLink.actionName}: fetch failed`);
		}
	}

	return {
		actionDetailsByName,
		completeCount,
		incompleteActionReports,
		duplicateCount,
	};
}

/**
 * Parses the keyword-action root page and returns candidate action names and URLs.
 */
function collectKeywordActionLinks(keywordActionRootHtml: string): KeywordActionLink[] {
	const parsedHtml = load(keywordActionRootHtml);
	const rulesListItems = collectRulesSectionListItems(parsedHtml);
	const keywordActionLinks: KeywordActionLink[] = [];

	for (const rulesListItem of rulesListItems) {
		const listItem = parsedHtml(rulesListItem);
		const listItemText = normalizeDisplayText(listItem.text());
		if (!RULE_ENTRY_PREFIX_PATTERN.test(listItemText)) {
			continue;
		}

		const linkAnchor = listItem.find("a[href]").first();
		if (linkAnchor.length === 0) {
			continue;
		}

		const actionName = normalizeDisplayText(linkAnchor.text());
		if (actionName.length === 0) {
			continue;
		}

		const actionUrl = resolveKeywordActionUrl(linkAnchor.attr("href") ?? null);
		if (!actionUrl) {
			continue;
		}

		keywordActionLinks.push({
			actionName,
			actionUrl,
		});
	}

	return keywordActionLinks;
}

/**
 * Collects list items that appear in the Rules section on the root page.
 */
function collectRulesSectionListItems(
	parsedHtml: CheerioAPI,
): Parameters<CheerioAPI>[0][] {
	let contentRoot = parsedHtml("#mw-content-text .mw-parser-output").first();
	if (contentRoot.length === 0) {
		contentRoot = parsedHtml(".mw-parser-output").first();
	}
	if (contentRoot.length === 0) {
		contentRoot = parsedHtml("body").first();
	}

	const headingElements = contentRoot.find("h2, h3, h4, h5, h6");
	for (const headingElement of headingElements.toArray()) {
		const heading = parsedHtml(headingElement);
		if (getHeadingText(heading) !== RULES_SECTION_HEADING_LABEL) {
			continue;
		}

		const listItems: Parameters<CheerioAPI>[0][] = [];
		let currentElement = heading.next();
		while (currentElement.length > 0) {
			const tagName = getElementTagName(currentElement);
			if (isHeadingTag(tagName)) {
				break;
			}

			if (tagName === "li") {
				listItems.push(currentElement.get(0));
			}

			for (const listItem of currentElement.find("li").toArray()) {
				listItems.push(listItem);
			}

			currentElement = currentElement.next();
		}

		if (listItems.length > 0) {
			return listItems;
		}
	}

	return [];
}

/**
 * Resolves and validates a wiki URL target from a link href.
 */
function resolveKeywordActionUrl(hrefValue: string | null): string | null {
	if (!hrefValue || hrefValue.startsWith("#")) {
		return null;
	}

	try {
		const resolvedUrl = new URL(hrefValue, KEYWORD_ACTION_ROOT_URL);
		resolvedUrl.hash = "";
		if (!isHttpProtocol(resolvedUrl.protocol)) {
			return null;
		}

		const actionParam = resolvedUrl.searchParams.get("action");
		if (actionParam === "edit" || actionParam === "history") {
			return null;
		}

		if (resolvedUrl.toString() === KEYWORD_ACTION_ROOT_URL) {
			return null;
		}

		return resolvedUrl.toString();
	} catch {
		return null;
	}
}

/**
 * Extracts all supported fields for a keyword action from its page HTML.
 */
function extractKeywordActionDetails(
	actionPageHtml: string,
	sourceUrl: string,
): KeywordActionDetails {
	const parsedHtml = load(actionPageHtml);
	return {
		intro: extractIntro(parsedHtml),
		description: extractDescription(parsedHtml),
		reminderText: extractInfoboxFieldValue(parsedHtml, {
			rowLabels: ["reminder text"],
			dataSources: [
				"reminder_text",
				"reminder-text",
				"remindertext",
			],
		}),
		sourceUrl,
	};
}

/**
 * Finds the first non-empty introductory paragraph for a keyword-action page.
 */
function extractIntro(parsedHtml: CheerioAPI): string {
	const introSelectors = [
		"#mw-content-text .mw-parser-output > p",
		"#mw-content-text p",
		".mw-parser-output > p",
		"p",
	];

	for (const selector of introSelectors) {
		const paragraphElements = parsedHtml(selector);
		for (const paragraphElement of paragraphElements.toArray()) {
			const paragraphText = normalizeFieldText(parsedHtml(paragraphElement).text());
			if (paragraphText.length > 0) {
				return paragraphText;
			}
		}
	}

	return "";
}

/**
 * Extracts the Description section content from the page body.
 */
function extractDescription(parsedHtml: CheerioAPI): string {
	return extractSectionText(parsedHtml, ["description"]);
}

/**
 * Collects text content under the first matching section heading.
 */
function extractSectionText(
	parsedHtml: CheerioAPI,
	targetSectionLabels: string[],
): string {
	const normalizedTargetLabels = targetSectionLabels.map(normalizeFieldLabel);
	let contentRoot = parsedHtml("#mw-content-text .mw-parser-output").first();
	if (contentRoot.length === 0) {
		contentRoot = parsedHtml(".mw-parser-output").first();
	}
	if (contentRoot.length === 0) {
		contentRoot = parsedHtml("body").first();
	}

	const headingElements = contentRoot.find("h2, h3, h4, h5, h6");
	for (const headingElement of headingElements.toArray()) {
		const heading = parsedHtml(headingElement);
		const headingText = getHeadingText(heading);
		if (!matchesFieldLabel(headingText, normalizedTargetLabels, true)) {
			continue;
		}

		const sectionChunks: string[] = [];
		let currentElement = heading.next();
		while (currentElement.length > 0) {
			const tagName = getElementTagName(currentElement);
			if (isHeadingTag(tagName)) {
				break;
			}

			if (isTextContentTag(tagName)) {
				const textChunk = normalizeFieldText(currentElement.text());
				if (textChunk.length > 0) {
					sectionChunks.push(textChunk);
				}
			}

			currentElement = currentElement.next();
		}

		if (sectionChunks.length > 0) {
			return sectionChunks.join("\n\n");
		}
	}

	return "";
}

/**
 * Reads a named value from infobox rows or portable infobox data fields.
 */
function extractInfoboxFieldValue(
	parsedHtml: CheerioAPI,
	options: InfoboxFieldOptions,
): string {
	const normalizedRowLabels = options.rowLabels.map(normalizeFieldLabel);

	const rowElements = parsedHtml("table.infobox tr, table[class*='infobox'] tr");
	for (const rowElement of rowElements.toArray()) {
		const row = parsedHtml(rowElement);
		const headerText = normalizeFieldLabel(row.find("th").first().text());
		if (!matchesFieldLabel(headerText, normalizedRowLabels, options.allowContainsMatch)) {
			continue;
		}

		const valueText = normalizeFieldText(row.find("td").first().text());
		if (valueText.length > 0) {
			return valueText;
		}
	}

	for (const dataSourceName of options.dataSources) {
		const selectors = [
			`[data-source='${dataSourceName}'] .pi-data-value`,
			`[data-source='${dataSourceName}'] .value`,
			`[data-source='${dataSourceName}']`,
			`[data-source*='${dataSourceName}'] .pi-data-value`,
			`[data-source*='${dataSourceName}'] .value`,
			`[data-source*='${dataSourceName}']`,
		];

		for (const selector of selectors) {
			const valueText = normalizeFieldText(parsedHtml(selector).first().text());
			if (valueText.length > 0) {
				return valueText;
			}
		}
	}

	const portableInfoboxItems = parsedHtml(
		".portable-infobox .pi-item.pi-data, .portable-infobox .pi-data, .pi-item.pi-data",
	);
	for (const portableItem of portableInfoboxItems.toArray()) {
		const item = parsedHtml(portableItem);
		const labelText = normalizeFieldLabel(
			item.find(".pi-data-label, .pi-data-label > *").first().text(),
		);
		if (!matchesFieldLabel(labelText, normalizedRowLabels, options.allowContainsMatch)) {
			continue;
		}

		const valueText = normalizeFieldText(
			item.find(".pi-data-value, .pi-data-value > *, .value").first().text(),
		);
		if (valueText.length > 0) {
			return valueText;
		}
	}

	return "";
}

/**
 * Normalizes scraped field text and removes bracketed footnote references.
 */
function normalizeFieldText(rawText: string): string {
	return normalizeDisplayText(rawText.replaceAll(FOOTNOTE_REFERENCE_PATTERN, ""));
}

/**
 * Collapses whitespace and trims display text.
 */
function normalizeDisplayText(rawText: string): string {
	return rawText.replaceAll("\u00a0", " ").replaceAll(WHITESPACE_PATTERN, " ").trim();
}

/**
 * Normalizes label text for case-insensitive matching.
 */
function normalizeFieldLabel(rawText: string): string {
	const normalizedLabel = normalizeDisplayText(rawText).toLowerCase();
	return normalizedLabel
		.replaceAll(":", "")
		.replaceAll("(", "")
		.replaceAll(")", "");
}

/**
 * Extracts normalized heading text, excluding edit controls when needed.
 */
function getHeadingText(heading: ReturnType<CheerioAPI>): string {
	const headlineText = normalizeFieldLabel(heading.find(".mw-headline").first().text());
	if (headlineText.length > 0) {
		return headlineText;
	}

	const headingClone = heading.clone();
	headingClone.find(".mw-editsection").remove();
	return normalizeFieldLabel(headingClone.text());
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
 * Determines whether a candidate label matches expected labels.
 */
function matchesFieldLabel(
	candidateLabel: string,
	targetLabels: string[],
	allowContainsMatch = false,
): boolean {
	if (candidateLabel.length === 0) {
		return false;
	}

	if (targetLabels.includes(candidateLabel)) {
		return true;
	}

	if (!allowContainsMatch) {
		return false;
	}

	for (const targetLabel of targetLabels) {
		if (candidateLabel.includes(targetLabel) || targetLabel.includes(candidateLabel)) {
			return true;
		}
	}

	return false;
}

/**
 * Normalizes an action name for duplicate detection.
 */
function normalizeForCollision(actionName: string): string {
	return normalizeDisplayText(actionName).toLowerCase();
}

/**
 * Checks whether a URL protocol is HTTP or HTTPS.
 */
function isHttpProtocol(protocol: string): boolean {
	return protocol === "http:" || protocol === "https:";
}

/**
 * Writes generated keyword-action details to the output JSON file.
 */
async function writeOutputJson(
	actionDetailsByName: Record<string, KeywordActionDetails>,
): Promise<void> {
	await mkdir(dirname(OUTPUT_FILE_PATH), { recursive: true });
	const jsonContent = `${JSON.stringify(actionDetailsByName, null, JSON_INDENT_SPACES)}\n`;
	await Bun.write(OUTPUT_FILE_PATH, jsonContent);
}

/**
 * Prints run statistics and incomplete-record details.
 */
function printSummary(discoveredCount: number, buildResult: BuildResult): void {
	console.log(`Generated ${OUTPUT_FILE_RELATIVE_PATH}`);
	console.log(`Discovered keyword action entries: ${discoveredCount}`);
	console.log(`Complete records: ${buildResult.completeCount}`);
	console.log(`Incomplete records: ${buildResult.incompleteActionReports.length}`);
	console.log(`Duplicates skipped: ${buildResult.duplicateCount}`);

	if (buildResult.incompleteActionReports.length > 0) {
		console.log("Incomplete keyword action reports:");
		for (const incompleteActionReport of buildResult.incompleteActionReports) {
			console.log(`- ${incompleteActionReport}`);
		}
	}
}

/**
 * Lists keyword-action detail fields that are still empty.
 */
function findMissingFields(
	actionDetails: KeywordActionDetails,
): Array<keyof KeywordActionDetails> {
	const missingFields: Array<keyof KeywordActionDetails> = [];
	const fieldNames = Object.keys(actionDetails) as Array<keyof KeywordActionDetails>;
	for (const fieldName of fieldNames) {
		if (actionDetails[fieldName].length === 0) {
			missingFields.push(fieldName);
		}
	}

	return missingFields;
}

/**
 * Creates an empty keyword-action details object for failed fetches.
 */
function createEmptyKeywordActionDetails(sourceUrl: string): KeywordActionDetails {
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

main().catch((error) => {
	console.error(`Keyword-action generation failed: ${toErrorMessage(error)}`);
	process.exit(1);
});
