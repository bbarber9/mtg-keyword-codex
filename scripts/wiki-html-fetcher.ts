import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const JSON_INDENT_SPACES = 2;
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
const DEFAULT_REQUEST_DELAY_MS = 150;
const CACHE_FILE_EXTENSION = ".json";

type ParsedCacheControl = {
	directives: Set<string>;
	maxAgeSeconds: number | null;
};

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

	return async function fetchHtmlPage(pageUrl: string): Promise<string> {
		const cacheFilePath = getCacheFilePathForUrl(
			options.cacheDirectoryPath,
			pageUrl,
		);
		const cachedPage = await loadCachedPage(cacheFilePath);
		const nowUnixMs = Date.now();

		if (cachedPage && isCachedPageFresh(cachedPage, nowUnixMs)) {
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
 * Evaluates whether a cached page is still fresh per cache headers.
 */
function isCachedPageFresh(
	cachedPage: CachedWikiPage,
	nowUnixMs: number,
): boolean {
	const parsedCacheControl = parseCacheControlHeader(
		cachedPage.headers[HEADER_CACHE_CONTROL],
	);
	if (parsedCacheControl.directives.has(CACHE_CONTROL_NO_STORE)) {
		return false;
	}
	if (parsedCacheControl.directives.has(CACHE_CONTROL_NO_CACHE)) {
		return false;
	}

	const ageSeconds =
		(nowUnixMs - cachedPage.fetchedAtUnixMs) / MILLISECONDS_PER_SECOND;
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
	const cacheControl = parseCacheControlHeader(
		responseHeaders[HEADER_CACHE_CONTROL],
	);
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
	await writeFile(
		cacheFilePath,
		`${JSON.stringify(cachedPage, null, JSON_INDENT_SPACES)}\n`,
	);
}

/**
 * Deletes a cache file from disk if it exists.
 */
async function removeCacheFile(cacheFilePath: string): Promise<void> {
	try {
		await unlink(cacheFilePath);
	} catch (error) {
		if (isErrorWithCode(error, "ENOENT")) {
			return;
		}

		throw error;
	}
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
