import { createHash } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type CheerioAPI, load } from "cheerio";

const FULL_LIST_URL = "https://mtg.wiki/page/Counter_(marker)/Full_List";
const OUTPUT_FILE_RELATIVE_PATH = "src/data/counters.json";
const WIKI_CACHE_DIRECTORY_RELATIVE_PATH = "scripts/mtg-wiki-cache";
const JSON_INDENT_SPACES = 2;
const FOOTNOTE_REFERENCE_PATTERN = /\[\d+\]/g;
const WHITESPACE_PATTERN = /\s+/g;
const HEADER_CACHE_CONTROL = "cache-control";
const HEADER_EXPIRES = "expires";
const HEADER_ETAG = "etag";
const HEADER_LAST_MODIFIED = "last-modified";
const HEADER_IF_NONE_MATCH = "If-None-Match";
const HEADER_IF_MODIFIED_SINCE = "If-Modified-Since";
const CACHE_CONTROL_NO_STORE = "no-store";
const CACHE_CONTROL_NO_CACHE = "no-cache";
const CACHE_CONTROL_MAX_AGE = "max-age";
const MILLISECONDS_PER_SECOND = 1000;

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

type CachedWikiPage = {
	url: string;
	body: string;
	status: number;
	fetchedAtUnixMs: number;
	headers: Record<string, string>;
};

type ParsedCacheControl = {
	directives: Set<string>;
	maxAgeSeconds: number | null;
};

const SCRIPT_FILE_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIRECTORY_PATH = dirname(SCRIPT_FILE_PATH);
const PROJECT_ROOT_PATH = resolve(SCRIPT_DIRECTORY_PATH, "..");
const OUTPUT_FILE_PATH = resolve(PROJECT_ROOT_PATH, OUTPUT_FILE_RELATIVE_PATH);
const WIKI_CACHE_DIRECTORY_PATH = resolve(
	PROJECT_ROOT_PATH,
	WIKI_CACHE_DIRECTORY_RELATIVE_PATH,
);
let lastNetworkRequestAtUnixMs = 0;

/**
 * Runs the end-to-end counter import workflow and writes the output JSON.
 */
async function main(): Promise<void> {
	const fullListHtml = await fetchHtmlPage(FULL_LIST_URL);
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
		const normalizedCounterName = normalizeForCollision(counterLink.counterName);
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
	const parsedHtml = load(fullListHtml);
	const inContentAnchors = parsedHtml("#mw-content-text a[href]");
	const anchorElements = inContentAnchors.length > 0
		? inContentAnchors
		: parsedHtml("a[href]");
	const counterLinks: CounterLink[] = [];
	for (const anchorElement of anchorElements.toArray()) {
		const counterLink = extractCounterLink(parsedHtml, anchorElement);
		if (counterLink) {
			counterLinks.push(counterLink);
		}
	}

	return counterLinks;
}

/**
 * Builds a counter link record from an anchor element when it looks valid.
 */
function extractCounterLink(
	parsedHtml: CheerioAPI,
	anchorElement: Parameters<CheerioAPI>[0],
): CounterLink | null {
	const anchor = parsedHtml(anchorElement);
	const counterName = normalizeDisplayText(anchor.text());
	if (!isCounterName(counterName)) {
		return null;
	}

	const counterUrl = resolveCounterUrl(anchor.attr("href") ?? null);
	if (!counterUrl) {
		return null;
	}

	return { counterName, counterUrl };
}

/**
 * Resolves and validates a wiki URL target from a link href.
 */
function resolveCounterUrl(hrefValue: string | null): string | null {
	if (!hrefValue || hrefValue.startsWith("#")) {
		return null;
	}

	try {
		const resolvedUrl = new URL(hrefValue, FULL_LIST_URL);
		resolvedUrl.hash = "";
		if (!isHttpProtocol(resolvedUrl.protocol)) {
			return null;
		}

		const actionParam = resolvedUrl.searchParams.get("action");
		if (actionParam === "edit" || actionParam === "history") {
			return null;
		}

		if (resolvedUrl.toString() === FULL_LIST_URL) {
			return null;
		}

		return resolvedUrl.toString();
	} catch {
		return null;
	}
}

/**
 * Extracts all supported fields for a counter from its page HTML.
 */
function extractCounterDetails(
	counterPageHtml: string,
	sourceUrl: string,
): CounterDetails {
	const parsedHtml = load(counterPageHtml);
	return {
		intro: extractIntro(parsedHtml),
		description: extractDescription(parsedHtml),
		use: extractInfoboxFieldValue(parsedHtml, {
			rowLabels: ["use"],
			dataSources: ["use"],
		}),
		placedOn: extractInfoboxFieldValue(parsedHtml, {
			rowLabels: ["placed on"],
			dataSources: ["placed_on", "placed-on", "placedon"],
		}),
		sourceUrl,
	};
}

/**
 * Finds the first non-empty introductory paragraph for a counter page.
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
	return extractSectionText(parsedHtml, [
		"description",
	]);
}

type InfoboxFieldOptions = {
	rowLabels: string[];
	dataSources: string[];
	allowContainsMatch?: boolean;
};

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
	return tagName === "h2" || tagName === "h3" || tagName === "h4" || tagName === "h5" || tagName === "h6";
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
	return normalizeDisplayText(counterName).toLowerCase();
}

/**
 * Fetches HTML with HTTP caching and conditional revalidation support.
 */
async function fetchHtmlPage(pageUrl: string): Promise<string> {
	const cacheFilePath = getCacheFilePathForUrl(pageUrl);
	const cachedPage = await loadCachedPage(cacheFilePath);
	const nowUnixMs = Date.now();

	if (cachedPage && isCachedPageFresh(cachedPage, nowUnixMs)) {
		console.log(`[cache-hit] ${pageUrl}`);
		return cachedPage.body;
	}

	await waitForNetworkRequestDelay();

	const requestHeaders = new Headers({
		"User-Agent": "mtg-keyword-codex/0.1 (counter-importer)",
		Accept: "text/html,application/xhtml+xml",
	});
	if (cachedPage) {
		applyConditionalRequestHeaders(requestHeaders, cachedPage.headers);
	}

	const response = await fetch(pageUrl, {
		headers: requestHeaders,
		redirect: "follow",
	});
	lastNetworkRequestAtUnixMs = Date.now();

	if (response.status === 304 && cachedPage) {
		const mergedHeaders = mergeHeaderRecords(
			cachedPage.headers,
			headerRecordFromResponse(response.headers),
		);
		await saveCachedPage(cacheFilePath, {
			...cachedPage,
			headers: mergedHeaders,
			fetchedAtUnixMs: nowUnixMs,
		});
		console.log(`[cache-hit-304] ${pageUrl}`);
		return cachedPage.body;
	}

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText}`);
	}

	const responseBody = await response.text();
	await updateCacheFromResponse(
		cacheFilePath,
		pageUrl,
		response,
		responseBody,
		nowUnixMs,
	);
	return responseBody;
}

/**
 * Checks whether a URL protocol is HTTP or HTTPS.
 */
function isHttpProtocol(protocol: string): boolean {
	return protocol === "http:" || protocol === "https:";
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
	console.log(`Incomplete records: ${buildResult.incompleteCounterReports.length}`);
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
function findMissingFields(counterDetails: CounterDetails): Array<keyof CounterDetails> {
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
 * Applies rate limiting between outbound network requests.
 */
async function waitForNetworkRequestDelay(): Promise<void> {
	const networkRequestDelayMs = 150;
	const nowUnixMs = Date.now();
	const elapsedMs = nowUnixMs - lastNetworkRequestAtUnixMs;
	if (elapsedMs >= networkRequestDelayMs) {
		return;
	}

	const waitDurationMs = networkRequestDelayMs - elapsedMs;
	await wait(waitDurationMs);
}

/**
 * Builds the on-disk cache file path for a page URL.
 */
function getCacheFilePathForUrl(pageUrl: string): string {
	const cacheFileExtension = ".json";
	const pageUrlHash = createHash("sha256").update(pageUrl).digest("hex");
	return join(WIKI_CACHE_DIRECTORY_PATH, `${pageUrlHash}${cacheFileExtension}`);
}

/**
 * Loads and validates a cached page record from disk.
 */
async function loadCachedPage(cacheFilePath: string): Promise<CachedWikiPage | null> {
	const cacheFile = Bun.file(cacheFilePath);
	if (!(await cacheFile.exists())) {
		return null;
	}

	try {
		const parsedCache = JSON.parse(await cacheFile.text()) as CachedWikiPage;
		if (!isValidCachedWikiPage(parsedCache)) {
			return null;
		}

		return parsedCache;
	} catch {
		return null;
	}
}

/**
 * Validates unknown cache data against the cached page shape.
 */
function isValidCachedWikiPage(candidate: unknown): candidate is CachedWikiPage {
	if (!candidate || typeof candidate !== "object") {
		return false;
	}

	const maybeCachedPage = candidate as Partial<CachedWikiPage>;
	return (
		typeof maybeCachedPage.url === "string" &&
		typeof maybeCachedPage.body === "string" &&
		typeof maybeCachedPage.status === "number" &&
		typeof maybeCachedPage.fetchedAtUnixMs === "number" &&
		typeof maybeCachedPage.headers === "object" &&
		maybeCachedPage.headers !== null
	);
}

/**
 * Evaluates whether a cached page is still fresh per cache headers.
 */
function isCachedPageFresh(cachedPage: CachedWikiPage, nowUnixMs: number): boolean {
	const parsedCacheControl = parseCacheControlHeader(
		cachedPage.headers[HEADER_CACHE_CONTROL],
	);
	if (parsedCacheControl.directives.has(CACHE_CONTROL_NO_STORE)) {
		return false;
	}
	if (parsedCacheControl.directives.has(CACHE_CONTROL_NO_CACHE)) {
		return false;
	}

	const ageSeconds = (nowUnixMs - cachedPage.fetchedAtUnixMs) / MILLISECONDS_PER_SECOND;
	if (parsedCacheControl.maxAgeSeconds !== null) {
		return ageSeconds <= parsedCacheControl.maxAgeSeconds;
	}

	const expiresHeaderValue = cachedPage.headers[HEADER_EXPIRES];
	if (expiresHeaderValue) {
		const expiresUnixMs = Date.parse(expiresHeaderValue);
		if (Number.isFinite(expiresUnixMs)) {
			return nowUnixMs < expiresUnixMs;
		}
	}

	return false;
}

/**
 * Parses Cache-Control directives used by freshness logic.
 */
function parseCacheControlHeader(
	cacheControlHeaderValue: string | undefined,
): ParsedCacheControl {
	const directives = new Set<string>();
	let maxAgeSeconds: number | null = null;
	if (!cacheControlHeaderValue) {
		return { directives, maxAgeSeconds };
	}

	for (const rawDirective of cacheControlHeaderValue.split(",")) {
		const normalizedDirective = rawDirective.trim().toLowerCase();
		if (normalizedDirective.length === 0) {
			continue;
		}

		const [directiveName, directiveValue] = normalizedDirective.split("=");
		directives.add(directiveName);
		if (directiveName === CACHE_CONTROL_MAX_AGE && directiveValue) {
			const parsedMaxAge = Number.parseInt(directiveValue, 10);
			if (!Number.isNaN(parsedMaxAge) && parsedMaxAge >= 0) {
				maxAgeSeconds = parsedMaxAge;
			}
		}
	}

	return { directives, maxAgeSeconds };
}

/**
 * Adds conditional revalidation headers from cached metadata.
 */
function applyConditionalRequestHeaders(
	requestHeaders: Headers,
	cachedHeaders: Record<string, string>,
): void {
	const etagHeaderValue = cachedHeaders[HEADER_ETAG];
	if (etagHeaderValue) {
		requestHeaders.set(HEADER_IF_NONE_MATCH, etagHeaderValue);
	}

	const lastModifiedHeaderValue = cachedHeaders[HEADER_LAST_MODIFIED];
	if (lastModifiedHeaderValue) {
		requestHeaders.set(HEADER_IF_MODIFIED_SINCE, lastModifiedHeaderValue);
	}
}

/**
 * Converts response headers to a lowercase keyed record.
 */
function headerRecordFromResponse(responseHeaders: Headers): Record<string, string> {
	const headerRecord: Record<string, string> = {};
	for (const [headerName, headerValue] of responseHeaders.entries()) {
		headerRecord[headerName.toLowerCase()] = headerValue;
	}

	return headerRecord;
}

/**
 * Merges cached and response headers for cache updates.
 */
function mergeHeaderRecords(
	baseHeaders: Record<string, string>,
	overrideHeaders: Record<string, string>,
): Record<string, string> {
	return {
		...baseHeaders,
		...overrideHeaders,
	};
}

/**
 * Updates or invalidates the on-disk cache based on response headers.
 */
async function updateCacheFromResponse(
	cacheFilePath: string,
	pageUrl: string,
	response: Response,
	responseBody: string,
	fetchedAtUnixMs: number,
): Promise<void> {
	const responseHeaders = headerRecordFromResponse(response.headers);
	const cacheControl = parseCacheControlHeader(responseHeaders[HEADER_CACHE_CONTROL]);
	if (cacheControl.directives.has(CACHE_CONTROL_NO_STORE)) {
		await removeCacheFile(cacheFilePath);
		return;
	}

	if (response.status !== 200) {
		return;
	}

	await saveCachedPage(cacheFilePath, {
		url: pageUrl,
		body: responseBody,
		status: response.status,
		fetchedAtUnixMs,
		headers: responseHeaders,
	});
}

/**
 * Persists a cached page record to disk.
 */
async function saveCachedPage(
	cacheFilePath: string,
	cachedPage: CachedWikiPage,
): Promise<void> {
	await mkdir(dirname(cacheFilePath), { recursive: true });
	await Bun.write(
		cacheFilePath,
		`${JSON.stringify(cachedPage, null, JSON_INDENT_SPACES)}\n`,
	);
}

/**
 * Deletes a cache file from disk if it exists.
 */
async function removeCacheFile(cacheFilePath: string): Promise<void> {
	const cacheFile = Bun.file(cacheFilePath);
	if (await cacheFile.exists()) {
		await unlink(cacheFilePath);
	}
}

/**
 * Sleeps for the specified number of milliseconds.
 */
function wait(milliseconds: number): Promise<void> {
	return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
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
