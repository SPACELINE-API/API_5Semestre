export const WORD_COUNT_MAX_DIGITS = 9;

export function parseWordCountInput(value: string): number | null {
	const digits = value.replace(/\D/g, '').slice(0, WORD_COUNT_MAX_DIGITS);
	return digits ? Number(digits) : null;
}

export function wordCountInputValue(value: number | null | undefined) {
	return value == null ? '' : String(value);
}
