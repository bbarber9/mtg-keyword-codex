export type DecklistEntry = {
	name: string;
	quantity: number;
};

const QUANTITY_RADIX = 10;
const MIN_QUANTITY = 1;
const SPLIT_DELIMITER = " ";
const MISSING_INDEX = -1;

export function parseDecklist(input: string): DecklistEntry[] {
	const entriesByName = new Map<string, DecklistEntry>();
	const lines = input.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) {
			continue;
		}

		const splitIndex = trimmed.indexOf(SPLIT_DELIMITER);
		if (splitIndex === MISSING_INDEX) {
			continue;
		}

		const quantityText = trimmed.slice(0, splitIndex).trim();
		const name = trimmed.slice(splitIndex + SPLIT_DELIMITER.length).trim();
		const quantity = Number.parseInt(quantityText, QUANTITY_RADIX);
		if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY || !name) {
			continue;
		}

		const key = name.toLowerCase();
		const existing = entriesByName.get(key);
		if (existing) {
			existing.quantity += quantity;
			continue;
		}

		entriesByName.set(key, { name, quantity });
	}

	return Array.from(entriesByName.values());
}
