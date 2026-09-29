export const CNPJ_SHAPE_PATTERN = /^[0-9A-Za-z]{12}[0-9]{2}$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCnpjShape(value: string): boolean {
	const normalized = value.replace(/[^0-9A-Za-z]/g, '');
	return CNPJ_SHAPE_PATTERN.test(normalized);
}

function calculateCnpjCheckDigit(value: string): number {
	const weights =
		value.length === 12
			? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
			: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
	const sum = [...value].reduce(
		(total, character, index) =>
			total + (character.charCodeAt(0) - 48) * weights[index],
		0,
	);
	const remainder = sum % 11;
	return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
	const normalized = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
	if (!CNPJ_SHAPE_PATTERN.test(normalized)) return false;

	const expectedFirstDigit = calculateCnpjCheckDigit(normalized.slice(0, 12));
	if (Number(normalized[12]) !== expectedFirstDigit) return false;

	const expectedSecondDigit = calculateCnpjCheckDigit(normalized.slice(0, 13));
	return Number(normalized[13]) === expectedSecondDigit;
}

export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
	const digits = value.replace(/\D/g, '');
	return digits.length === 10 || digits.length === 11;
}
