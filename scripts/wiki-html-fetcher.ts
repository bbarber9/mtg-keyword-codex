import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const JSON_INDENT_SPACES = 2;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_LOCAL_CACHE_WINDOW = 30;
const DEFAULT_REQUEST_DELAY_MS = 150;
const DEFAULT_LOCAL_CACHE_TTL_MS =
	MINUTES_PER_LOCAL_CACHE_WINDOW * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
const CACHE_FILE_EXTENSION = ".json";

export type CachedWikiPage = {
	url: string;
	body: string;
	status: number;
	fetchedAtUnixMs: number;
	headers: Record<string, string>;
};

export type CreateWikiHtmlPageFetcherOptions = {
	cacheDirectoryPath: string;
	userAgent: string;
	requestDelayMs?: number;
	ignoreCache?: boolean;
	localCacheTtlMs?: number;
};

/**
 * Creates a cache-aware MTG wiki HTML fetch function.
 */
export function createWikiHtmlPageFetcher(
	options: CreateWikiHtmlPageFetcherOptions,
): (pageUrl: string) => Promise<string> {
	let lastNetworkRequestAtUnixMs = 0;
	const networkRequestDelayMs =
		options.requestDelayMs ?? DEFAULT_REQUEST_DELAY_MS;
	const localCacheTtlMs = options.localCacheTtlMs ?? DEFAULT_LOCAL_CACHE_TTL_MS;

	return async function fetchHtmlPage(pageUrl: string): Promise<string> {
		const cacheFilePath = getCacheFilePathForUrl(
			options.cacheDirectoryPath,
			pageUrl,
		);
		const cachedPage = options.ignoreCache
			? null
			: await loadCachedPage(cacheFilePath);
		const nowUnixMs = Date.now();

		if (
			cachedPage &&
			isCachedPageFresh(cachedPage, nowUnixMs, localCacheTtlMs)
		) {
			console.log(`[cache-hit] ${pageUrl}`);
			return cachedPage.body;
		}

		await waitForNetworkRequestDelay(
			networkRequestDelayMs,
			lastNetworkRequestAtUnixMs,
		);

		const requestHeaders = new Headers({
			"User-Agent": options.userAgent,
			Accept: "text/html,application/xhtml+xml",
		});

		const response = await fetch(pageUrl, {
			headers: requestHeaders,
			redirect: "follow",
		});
		lastNetworkRequestAtUnixMs = Date.now();

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
	};
}

/**
 * Builds the on-disk cache file path for a page URL.
 */
function getCacheFilePathForUrl(
	cacheDirectoryPath: string,
	pageUrl: string,
): string {
	const pageUrlHash = createHash("sha256").update(pageUrl).digest("hex");
	return join(cacheDirectoryPath, `${pageUrlHash}${CACHE_FILE_EXTENSION}`);
}

/**
 * Loads and validates a cached page record from disk.
 */
async function loadCachedPage(
	cacheFilePath: string,
): Promise<CachedWikiPage | null> {
	let cacheFileContent: string;
	try {
		cacheFileContent = await readFile(cacheFilePath, "utf8");
	} catch (error) {
		if (isErrorWithCode(error, "ENOENT")) {
			return null;
		}

		throw error;
	}

	try {
		const parsedCache = JSON.parse(cacheFileContent) as CachedWikiPage;
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
function isValidCachedWikiPage(
	candidate: unknown,
): candidate is CachedWikiPage {
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
 * Evaluates whether a cached page is still fresh per the local scrape TTL.
 */
function isCachedPageFresh(
	cachedPage: CachedWikiPage,
	nowUnixMs: number,
	localCacheTtlMs: number,
): boolean {
	return nowUnixMs - cachedPage.fetchedAtUnixMs <= localCacheTtlMs;
}

/**
 * Converts response headers to a lowercase keyed record.
 */
function headerRecordFromResponse(
	responseHeaders: Headers,
): Record<string, string> {
	const headerRecord: Record<string, string> = {};
	for (const [headerName, headerValue] of responseHeaders.entries()) {
		headerRecord[headerName.toLowerCase()] = headerValue;
	}

	return headerRecord;
}

/**
 * Updates the on-disk scrape cache.
 */
async function updateCacheFromResponse(
	cacheFilePath: string,
	pageUrl: string,
	response: Response,
	responseBody: string,
	fetchedAtUnixMs: number,
): Promise<void> {
	if (response.status !== 200) {
		return;
	}

	await saveCachedPage(cacheFilePath, {
		url: pageUrl,
		body: responseBody,
		status: response.status,
		fetchedAtUnixMs,
		headers: headerRecordFromResponse(response.headers),
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
	await writeFile(
		cacheFilePath,
		`${JSON.stringify(cachedPage, null, JSON_INDENT_SPACES)}\n`,
	);
}

/**
 * Applies rate limiting between outbound network requests.
 */
async function waitForNetworkRequestDelay(
	networkRequestDelayMs: number,
	lastNetworkRequestAtUnixMs: number,
): Promise<void> {
	const nowUnixMs = Date.now();
	const elapsedMs = nowUnixMs - lastNetworkRequestAtUnixMs;
	if (elapsedMs >= networkRequestDelayMs) {
		return;
	}

	const waitDurationMs = networkRequestDelayMs - elapsedMs;
	await wait(waitDurationMs);
}

/**
 * Sleeps for the specified number of milliseconds.
 */
function wait(milliseconds: number): Promise<void> {
	return new Promise((resolvePromise) =>
		setTimeout(resolvePromise, milliseconds),
	);
}

function isErrorWithCode(error: unknown, code: string): boolean {
	return error instanceof Error && "code" in error && error.code === code;
}
