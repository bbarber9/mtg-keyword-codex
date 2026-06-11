import { readFile } from "node:fs/promises";

export const SHARED_KEYWORD_ALIAS_FILE_RELATIVE_PATH =
	"scripts/keyword-aliases.json";

export type KeywordAliasMap = Record<string, string>;

type AliasUtilityOptions = {
	collisionNormalizer: (value: string) => string;
	entityLabel: string;
	normalizeDisplayName: (value: string) => string;
};

type ApplyKeywordAliasesOptions<RecordType> = AliasUtilityOptions & {
	aliasesByName: KeywordAliasMap;
	canonicalRecordsByName: Record<string, RecordType>;
};

type LoadKeywordAliasesOptions = AliasUtilityOptions & {
	aliasFilePath: string;
};

export async function loadKeywordAliasesFromFile(
	loadKeywordAliasesOptions: LoadKeywordAliasesOptions,
): Promise<KeywordAliasMap> {
	const aliasMapJson = await readFile(
		loadKeywordAliasesOptions.aliasFilePath,
		"utf8",
	);
	const parsedAliasMap: unknown = JSON.parse(aliasMapJson);

	return validateKeywordAliasMap(parsedAliasMap, loadKeywordAliasesOptions);
}

export function applyKeywordAliases<RecordType>(
	applyKeywordAliasesOptions: ApplyKeywordAliasesOptions<RecordType>,
): Record<string, RecordType> {
	const {
		aliasesByName,
		canonicalRecordsByName,
		collisionNormalizer,
		entityLabel,
	} = applyKeywordAliasesOptions;
	const aliasedRecordsByName = {
		...canonicalRecordsByName,
	};
	const canonicalRecordNameByNormalizedName = new Map<string, string>();
	const seenOutputNames = new Map<string, string>();

	for (const canonicalRecordName of Object.keys(canonicalRecordsByName)) {
		const normalizedCanonicalRecordName =
			collisionNormalizer(canonicalRecordName);
		canonicalRecordNameByNormalizedName.set(
			normalizedCanonicalRecordName,
			canonicalRecordName,
		);
		seenOutputNames.set(normalizedCanonicalRecordName, canonicalRecordName);
	}

	for (const [aliasName, targetRecordName] of Object.entries(aliasesByName)) {
		const normalizedAliasName = collisionNormalizer(aliasName);
		const collidingOutputName = seenOutputNames.get(normalizedAliasName);
		if (collidingOutputName) {
			throw new Error(
				`${entityLabel} alias "${aliasName}" collides with existing output key "${collidingOutputName}".`,
			);
		}

		const canonicalRecordName = canonicalRecordNameByNormalizedName.get(
			collisionNormalizer(targetRecordName),
		);
		if (!canonicalRecordName) {
			throw new Error(
				`${entityLabel} alias "${aliasName}" targets missing keyword "${targetRecordName}".`,
			);
		}

		aliasedRecordsByName[aliasName] = {
			...canonicalRecordsByName[canonicalRecordName],
		};
		seenOutputNames.set(normalizedAliasName, aliasName);
	}

	return aliasedRecordsByName;
}

function validateKeywordAliasMap(
	parsedAliasMap: unknown,
	aliasUtilityOptions: AliasUtilityOptions,
): KeywordAliasMap {
	if (
		typeof parsedAliasMap !== "object" ||
		parsedAliasMap === null ||
		Array.isArray(parsedAliasMap)
	) {
		throw new Error(
			`${aliasUtilityOptions.entityLabel} aliases must be a JSON object.`,
		);
	}

	const normalizedAliasMap: KeywordAliasMap = {};
	const seenAliasNames = new Map<string, string>();
	for (const [rawAliasName, rawTargetRecordName] of Object.entries(
		parsedAliasMap,
	)) {
		if (typeof rawTargetRecordName !== "string") {
			throw new Error(
				`${aliasUtilityOptions.entityLabel} alias "${rawAliasName}" must map to a string keyword name.`,
			);
		}

		const aliasName = aliasUtilityOptions.normalizeDisplayName(rawAliasName);
		const targetRecordName =
			aliasUtilityOptions.normalizeDisplayName(rawTargetRecordName);
		if (aliasName.length === 0) {
			throw new Error(
				`${aliasUtilityOptions.entityLabel} aliases cannot use an empty alias name.`,
			);
		}

		if (targetRecordName.length === 0) {
			throw new Error(
				`${aliasUtilityOptions.entityLabel} alias "${aliasName}" cannot target an empty keyword name.`,
			);
		}

		const normalizedAliasName =
			aliasUtilityOptions.collisionNormalizer(aliasName);
		const existingAliasName = seenAliasNames.get(normalizedAliasName);
		if (existingAliasName) {
			throw new Error(
				`${aliasUtilityOptions.entityLabel} alias "${aliasName}" duplicates alias "${existingAliasName}".`,
			);
		}

		seenAliasNames.set(normalizedAliasName, aliasName);
		normalizedAliasMap[aliasName] = targetRecordName;
	}

	return normalizedAliasMap;
}
