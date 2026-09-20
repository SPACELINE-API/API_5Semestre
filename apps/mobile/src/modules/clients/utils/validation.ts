export const CNPJ_SHAPE_PATTERN = /^[0-9A-Za-z]{12}[0-9]{2}$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidCnpjShape(value: string): boolean {
	const normalized = value.replace(/[^0-9A-Za-z]/g, '');
	return CNPJ_SHAPE_PATTERN.test(normalized);
}

export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
	const digits = value.replace(/\D/g, '');
	return digits.length === 10 || digits.length === 11;
}
