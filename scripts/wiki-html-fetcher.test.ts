import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWikiHtmlPageFetcher } from "./wiki-html-fetcher";

const PAGE_URL = "https://mtg.wiki/page/Test_counter";
const USER_AGENT = "mtg-keyword-cheatsheet/test";
const THIRTY_ONE_MINUTES_MS = 31 * 60 * 1000;

describe("createWikiHtmlPageFetcher", () => {
	let cacheDirectoryPath: string;

	beforeEach(async () => {
		cacheDirectoryPath = await mkdtemp(join(tmpdir(), "wiki-html-fetcher-"));
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));
	});

	afterEach(async () => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		await rm(cacheDirectoryPath, { force: true, recursive: true });
	});

	it("reuses a cached page for 30 minutes even when response headers say no-store", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockImplementation(async () => createHtmlResponse("cached body"));
		vi.stubGlobal("fetch", fetchMock);
		const fetchHtmlPage = createWikiHtmlPageFetcher({
			cacheDirectoryPath,
			userAgent: USER_AGENT,
			requestDelayMs: 0,
		});

		await expect(fetchHtmlPage(PAGE_URL)).resolves.toBe("cached body");
		await expect(fetchHtmlPage(PAGE_URL)).resolves.toBe("cached body");

		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("fetches again after the local 30 minute cache expires", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(createHtmlResponse("cached body"))
			.mockResolvedValueOnce(createHtmlResponse("fresh body"));
		vi.stubGlobal("fetch", fetchMock);
		const fetchHtmlPage = createWikiHtmlPageFetcher({
			cacheDirectoryPath,
			userAgent: USER_AGENT,
			requestDelayMs: 0,
		});

		await expect(fetchHtmlPage(PAGE_URL)).resolves.toBe("cached body");
		vi.setSystemTime(new Date(Date.now() + THIRTY_ONE_MINUTES_MS));
		await expect(fetchHtmlPage(PAGE_URL)).resolves.toBe("fresh body");

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("fetches again when ignoreCache is enabled", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(createHtmlResponse("cached body"))
			.mockResolvedValueOnce(createHtmlResponse("fresh body"));
		vi.stubGlobal("fetch", fetchMock);

		const cachingFetchHtmlPage = createWikiHtmlPageFetcher({
			cacheDirectoryPath,
			userAgent: USER_AGENT,
			requestDelayMs: 0,
		});
		await expect(cachingFetchHtmlPage(PAGE_URL)).resolves.toBe("cached body");

		const cacheBypassingFetchHtmlPage = createWikiHtmlPageFetcher({
			cacheDirectoryPath,
			userAgent: USER_AGENT,
			requestDelayMs: 0,
			ignoreCache: true,
		});
		await expect(cacheBypassingFetchHtmlPage(PAGE_URL)).resolves.toBe(
			"fresh body",
		);

		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

function createHtmlResponse(responseBody: string): Response {
	return new Response(responseBody, {
		status: 200,
		headers: {
			"cache-control": "private, must-revalidate, max-age=0, no-store",
			"content-type": "text/html",
		},
	});
}
