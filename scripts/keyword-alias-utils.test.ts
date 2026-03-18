import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "bun:test";
import {
	applyKeywordAliases,
	loadKeywordAliasesFromFile,
} from "./keyword-alias-utils";

const NORMALIZE_FOR_COLLISION = (value: string) => value.trim().toLowerCase();
const NORMALIZE_DISPLAY_NAME = (value: string) =>
	value.replace(/\s+/g, " ").trim();

describe("keyword-alias-utils", () => {
	it("duplicates canonical records under alias names", () => {
		expect(
			applyKeywordAliases({
				aliasesByName: {
					"May be cast as though it had flash": "Flash",
				},
				canonicalRecordsByName: {
					Flash: {
						intro: "flash intro",
						description: "flash description",
						reminderText:
							"You may cast this spell any time you could cast an instant.",
						sourceUrl: "https://example.com/flash",
					},
				},
				collisionNormalizer: NORMALIZE_FOR_COLLISION,
				entityLabel: "Keyword ability",
				normalizeDisplayName: NORMALIZE_DISPLAY_NAME,
			}),
		).toEqual({
			Flash: {
				intro: "flash intro",
				description: "flash description",
				reminderText:
					"You may cast this spell any time you could cast an instant.",
				sourceUrl: "https://example.com/flash",
			},
			"May be cast as though it had flash": {
				intro: "flash intro",
				description: "flash description",
				reminderText:
					"You may cast this spell any time you could cast an instant.",
				sourceUrl: "https://example.com/flash",
			},
		});
	});

	it("throws when an alias targets a missing canonical record", () => {
		expect(() =>
			applyKeywordAliases({
				aliasesByName: {
					"Remove from the game": "Proliferate",
				},
				canonicalRecordsByName: {
					Exile: {
						intro: "exile intro",
						description: "exile description",
						reminderText: "",
						sourceUrl: "https://example.com/exile",
					},
				},
				collisionNormalizer: NORMALIZE_FOR_COLLISION,
				entityLabel: "Keyword action",
				normalizeDisplayName: NORMALIZE_DISPLAY_NAME,
			}),
		).toThrow(
			'Keyword action alias "Remove from the game" targets missing keyword "Proliferate".',
		);
	});

	it("throws when an alias name collides with an existing output key", () => {
		expect(() =>
			applyKeywordAliases({
				aliasesByName: {
					flash: "Flash",
				},
				canonicalRecordsByName: {
					Flash: {
						intro: "flash intro",
						description: "flash description",
						reminderText: "",
						sourceUrl: "https://example.com/flash",
					},
				},
				collisionNormalizer: NORMALIZE_FOR_COLLISION,
				entityLabel: "Keyword ability",
				normalizeDisplayName: NORMALIZE_DISPLAY_NAME,
			}),
		).toThrow(
			'Keyword ability alias "flash" collides with existing output key "Flash".',
		);
	});

	it("loads and normalizes aliases from a JSON file", async () => {
		const temporaryDirectoryPath = await mkdtemp(
			join(tmpdir(), "keyword-alias-utils-"),
		);
		const aliasFilePath = join(temporaryDirectoryPath, "aliases.json");

		try {
			await writeFile(
				aliasFilePath,
				JSON.stringify({
					"  Legendary   Landwalk ": "  Landwalk  ",
				}),
			);

			await expect(
				loadKeywordAliasesFromFile({
					aliasFilePath,
					collisionNormalizer: NORMALIZE_FOR_COLLISION,
					entityLabel: "Keyword ability",
					normalizeDisplayName: NORMALIZE_DISPLAY_NAME,
				}),
			).resolves.toEqual({
				"Legendary Landwalk": "Landwalk",
			});
		} finally {
			await rm(temporaryDirectoryPath, { force: true, recursive: true });
		}
	});
});
