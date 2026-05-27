import { asc, desc, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "../db/db";
import { codices, codexKeywords } from "../db/schema/codex-schema";
import { auth } from "../utils/auth";
import { processDeckList, type ProcessDeckListInput } from "./processDeckList";

const DEFAULT_CODEX_EXPIRATION_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const createCodex = createServerFn({ method: "POST" })
	.inputValidator((data: ProcessDeckListInput) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const session = await auth.api.getSession({ headers });

		if (!session?.user.id) {
			throw new Error("Unauthorized");
		}

		const processedDecklist = await processDeckList(data);
		const now = new Date();
		const codexId = crypto.randomUUID();
		const createdAt = now.toISOString();
		const expiresAt = new Date(
			now.getTime() + DEFAULT_CODEX_EXPIRATION_DAYS * MILLISECONDS_PER_DAY,
		).toISOString();
		const normalizedLink = normalizeOptionalValue(data.link);
		const normalizedPrimer = normalizeOptionalValue(data.primer);
		const normalizedTitle = data.name.trim();

		db.transaction((transaction) => {
			transaction
				.insert(codices)
				.values({
					id: codexId,
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
					.insert(codexKeywords)
					.values(
						processedDecklist.keywords.map((keywordCount) => ({
							codex_id: codexId,
							keyword: keywordCount.keyword,
							count: keywordCount.count,
						})),
					)
					.run();
			}
		});

		return { id: codexId };
	});

export type CodexKeywordRecord = {
	keyword: string;
	count: number;
};

export type CodexRecord = {
	id: string;
	title: string;
	link: string | null;
	primer: string | null;
	normalizedDecklist: string;
	createdAt: string;
	lastAccessedAt: string;
	expiresAt: string;
	keywords: CodexKeywordRecord[];
};

export const getCodex = createServerFn({ method: "GET" })
	.inputValidator((data: { id: string }) => data)
	.handler(async ({ data }) => {
		const codexRecord = await db
			.select()
			.from(codices)
			.where(eq(codices.id, data.id))
			.get();

		if (!codexRecord) {
			return null;
		}

		const now = new Date();
		if (new Date(codexRecord.expires_at).getTime() <= now.getTime()) {
			db.transaction((transaction) => {
				transaction
					.delete(codexKeywords)
					.where(eq(codexKeywords.codex_id, codexRecord.id))
					.run();
				transaction.delete(codices).where(eq(codices.id, codexRecord.id)).run();
			});

			return null;
		}

		const lastAccessedAt = now.toISOString();
		const expiresAt = new Date(
			now.getTime() + DEFAULT_CODEX_EXPIRATION_DAYS * MILLISECONDS_PER_DAY,
		).toISOString();

		await db
			.update(codices)
			.set({
				last_accessed_at: lastAccessedAt,
				expires_at: expiresAt,
			})
			.where(eq(codices.id, codexRecord.id));

		const keywordRecords = await db
			.select()
			.from(codexKeywords)
			.where(eq(codexKeywords.codex_id, codexRecord.id))
			.orderBy(desc(codexKeywords.count), asc(codexKeywords.keyword));

		return {
			id: codexRecord.id,
			title: codexRecord.title,
			link: codexRecord.link,
			primer: codexRecord.primer,
			normalizedDecklist: codexRecord.normalized_decklist,
			createdAt: codexRecord.created_at,
			lastAccessedAt,
			expiresAt,
			keywords: keywordRecords.map((keywordRecord) => ({
				keyword: keywordRecord.keyword,
				count: keywordRecord.count,
			})),
		} satisfies CodexRecord;
	});

function normalizeOptionalValue(value: string): string | null {
	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}
