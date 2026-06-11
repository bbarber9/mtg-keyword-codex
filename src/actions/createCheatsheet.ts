import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "../db/db";
import {
	cheatsheetKeywords,
	cheatsheets,
} from "../db/schema/cheatsheet-schema";
import { auth } from "../utils/auth";
import { type ProcessDeckListInput, processDeckList } from "./processDeckList";

const DEFAULT_CHEATSHEET_EXPIRATION_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const createCheatsheet = createServerFn({ method: "POST" })
	.inputValidator((data: ProcessDeckListInput) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });

		if (!session?.user.id) {
			throw new Error("Unauthorized");
		}

		const processedDecklist = await processDeckList(data);
		const now = new Date();
		const cheatsheetId = crypto.randomUUID();
		const createdAt = now.toISOString();
		const expiresAt = new Date(
			now.getTime() + DEFAULT_CHEATSHEET_EXPIRATION_DAYS * MILLISECONDS_PER_DAY,
		).toISOString();
		const normalizedLink = normalizeOptionalValue(data.link);
		const normalizedPrimer = normalizeOptionalValue(data.primer);
		const normalizedTitle = data.name.trim();

		db.transaction((transaction) => {
			transaction
				.insert(cheatsheets)
				.values({
					id: cheatsheetId,
					owner_id: session.user.id,
					title: normalizedTitle,
					link: normalizedLink,
					primer: normalizedPrimer,
					normalized_decklist: processedDecklist.normalizedDecklist,
					created_at: createdAt,
					last_accessed_at: createdAt,
					expires_at: expiresAt,
				})
				.run();

			if (processedDecklist.keywords.length > 0) {
				transaction
					.insert(cheatsheetKeywords)
					.values(
						processedDecklist.keywords.map((keywordCount) => ({
							cheatsheet_id: cheatsheetId,
							keyword: keywordCount.keyword,
							count: keywordCount.count,
						})),
					)
					.run();
			}
		});

		return { id: cheatsheetId };
	});

export type CheatsheetKeywordRecord = {
	keyword: string;
	count: number;
};

export type CheatsheetRecord = {
	id: string;
	title: string;
	link: string | null;
	primer: string | null;
	normalizedDecklist: string;
	createdAt: string;
	lastAccessedAt: string;
	expiresAt: string;
	keywords: CheatsheetKeywordRecord[];
};

export const getCheatsheet = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const cheatsheetRecord = await db
			.select()
			.from(cheatsheets)
			.where(eq(cheatsheets.id, data.id))
			.get();

		if (!cheatsheetRecord) {
			return null;
		}

		const now = new Date();
		if (new Date(cheatsheetRecord.expires_at).getTime() <= now.getTime()) {
			db.transaction((transaction) => {
				transaction
					.delete(cheatsheetKeywords)
					.where(eq(cheatsheetKeywords.cheatsheet_id, cheatsheetRecord.id))
					.run();
				transaction
					.delete(cheatsheets)
					.where(eq(cheatsheets.id, cheatsheetRecord.id))
					.run();
			});

			return null;
		}

		const lastAccessedAt = now.toISOString();
		const expiresAt = new Date(
			now.getTime() + DEFAULT_CHEATSHEET_EXPIRATION_DAYS * MILLISECONDS_PER_DAY,
		).toISOString();

		await db
			.update(cheatsheets)
			.set({
				last_accessed_at: lastAccessedAt,
				expires_at: expiresAt,
			})
			.where(eq(cheatsheets.id, cheatsheetRecord.id));

		const keywordRecords = await db
			.select()
			.from(cheatsheetKeywords)
			.where(eq(cheatsheetKeywords.cheatsheet_id, cheatsheetRecord.id))
			.orderBy(desc(cheatsheetKeywords.count), asc(cheatsheetKeywords.keyword));

		return {
			id: cheatsheetRecord.id,
			title: cheatsheetRecord.title,
			link: cheatsheetRecord.link,
			primer: cheatsheetRecord.primer,
			normalizedDecklist: cheatsheetRecord.normalized_decklist,
			createdAt: cheatsheetRecord.created_at,
			lastAccessedAt,
			expiresAt,
			keywords: keywordRecords.map((keywordRecord) => ({
				keyword: keywordRecord.keyword,
				count: keywordRecord.count,
			})),
		} satisfies CheatsheetRecord;
	});

function normalizeOptionalValue(value: string): string | null {
	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}
