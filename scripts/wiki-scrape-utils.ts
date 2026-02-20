import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { CheerioAPI } from "cheerio";

const FOOTNOTE_REFERENCE_PATTERN = /\[\d+\]/g;
const WHITESPACE_PATTERN = /\s+/g;
const SPACE_BEFORE_PUNCTUATION_PATTERN = /\s+([,.;:!?])/g;
const NON_BREAKING_SPACE_UNICODE = "\u00a0";
const JSON_INDENT_SPACES = 2;
const SECTION_TEXT_SEPARATOR = "\n\n";
const HEADING_TAG_NAMES = new Set(["h2", "h3", "h4", "h5", "h6"]);
const TEXT_CONTENT_TAG_NAMES = new Set(["p", "ul", "ol", "dl", "blockquote"]);

type RemoveFootnotesAndNormalizeWhitespaceOptions = {
	normalizeSpaceBeforePunctuation?: boolean;
};

/**
 * Collapses whitespace and trims display text.
 */
export function normalizeWhiteSpace(rawText: string): string {
	return rawText
		.replaceAll(NON_BREAKING_SPACE_UNICODE, " ")
		.replaceAll(WHITESPACE_PATTERN, " ")
		.trim();
}

/**
 * Normalizes scraped field text and removes bracketed footnote references.
 */
export function removeFootnotesAndNormalizeWhitespace(
	rawText: string,
	options: RemoveFootnotesAndNormalizeWhitespaceOptions = {},
): string {
	const textWithoutFootnotes = rawText.replaceAll(
		FOOTNOTE_REFERENCE_PATTERN,
		"",
	);
	const normalizedText = normalizeWhiteSpace(textWithoutFootnotes);

	if (!options.normalizeSpaceBeforePunctuation) {
		return normalizedText;
	}

	return normalizedText.replaceAll(SPACE_BEFORE_PUNCTUATION_PATTERN, "$1");
}

/**
 * Extracts section content under a heading span id until the next heading.
 */
export function extractSectionTextByHeadingId(
	$: CheerioAPI,
	headingId: string,
	normalizeText: (rawText: string) => string,
): string {
	const sectionSpan = $(`h2 span#${headingId}`).first();
	if (sectionSpan.length === 0) {
		return "";
	}

	const sectionHeading = sectionSpan.parent("h2").first();
	if (sectionHeading.length === 0) {
		return "";
	}

	const sectionTextChunks: string[] = [];
	let currentElement = sectionHeading.next();
	while (currentElement.length > 0) {
		const currentTagName = getElementTagName(currentElement);
		if (isHeadingTag(currentTagName)) {
			break;
		}

		if (isTextContentTag(currentTagName)) {
			const textChunk = normalizeText(currentElement.text());
			if (textChunk.length > 0) {
				sectionTextChunks.push(textChunk);
			}
		}

		currentElement = currentElement.next();
	}

	return sectionTextChunks.join(SECTION_TEXT_SEPARATOR);
}

/**
 * Reads infobox key-value rows into a normalized lookup object.
 */
export function loadInfoBoxData(
	$: CheerioAPI,
	normalizeValueText: (rawText: string) => string,
): Record<string, string> {
	const infoBoxData: Record<string, string> = {};
	const infoBoxRows = $("table.infobox tr");
	for (const infoBoxRow of infoBoxRows.toArray()) {
		const infoBoxRowElement = $(infoBoxRow);
		if (
			infoBoxRowElement.find("th").length === 0 ||
			infoBoxRowElement.find("td").length === 0
		) {
			continue;
		}

		const headerText = normalizeWhiteSpace(
			infoBoxRowElement.find("th").first().text().toLowerCase(),
		);
		const valueText = normalizeValueText(
			infoBoxRowElement.find("td").first().text(),
		);
		infoBoxData[headerText] = valueText;
	}

	return infoBoxData;
}

/**
 * Normalizes a page name for duplicate detection.
 */
export function normalizeForCollision(name: string): string {
	return normalizeWhiteSpace(name).toLowerCase();
}

/**
 * Writes a JSON file, including parent directory creation and trailing newline.
 */
export async function writeJsonFile(
	outputFilePath: string,
	jsonObject: unknown,
): Promise<void> {
	await mkdir(dirname(outputFilePath), { recursive: true });
	const jsonContent = `${JSON.stringify(jsonObject, null, JSON_INDENT_SPACES)}\n`;
	await Bun.write(outputFilePath, jsonContent);
}

/**
 * Lists object keys with empty string values.
 */
export function findMissingFields<T extends Record<string, string>>(
	dataRecord: T,
): Array<keyof T> {
	const missingFieldNames: Array<keyof T> = [];
	const fieldNames = Object.keys(dataRecord) as Array<keyof T>;
	for (const fieldName of fieldNames) {
		if (dataRecord[fieldName].length === 0) {
			missingFieldNames.push(fieldName);
		}
	}

	return missingFieldNames;
}

/**
 * Converts unknown thrown values into readable error text.
 */
export function toErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function getElementTagName(element: ReturnType<CheerioAPI>): string {
	const tagName = element.prop("tagName");
	return typeof tagName === "string" ? tagName.toLowerCase() : "";
}

function isHeadingTag(tagName: string): boolean {
	return HEADING_TAG_NAMES.has(tagName);
}

function isTextContentTag(tagName: string): boolean {
	return TEXT_CONTENT_TAG_NAMES.has(tagName);
}
