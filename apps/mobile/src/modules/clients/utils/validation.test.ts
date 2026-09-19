import { isValidCnpjShape, isValidEmail, isValidPhone } from './validation';

describe('isValidCnpjShape', () => {
	it('accepts a masked 14-character numeric CNPJ', () => {
		expect(isValidCnpjShape('11.222.333/0001-81')).toBe(true);
	});

	it('accepts a raw 14-character alphanumeric CNPJ with numeric check digits', () => {
		expect(isValidCnpjShape('ABCDEFGH000123')).toBe(true);
	});

	it('rejects a CNPJ whose check digits are not numeric', () => {
		expect(isValidCnpjShape('ABCDEFGH00012A')).toBe(false);
	});

	it('rejects a CNPJ with fewer than 14 characters', () => {
		expect(isValidCnpjShape('11.222.333/0001-8')).toBe(false);
	});

	it('rejects a CNPJ with more than 14 characters', () => {
		expect(isValidCnpjShape('11.222.333/0001-819')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(isValidCnpjShape('')).toBe(false);
	});
});

describe('isValidEmail', () => {
	it('accepts a well-formed email', () => {
		expect(isValidEmail('contato@empresa.com')).toBe(true);
	});

	it('rejects an email missing the @', () => {
		expect(isValidEmail('contatoempresa.com')).toBe(false);
	});

	it('rejects an email missing the domain', () => {
		expect(isValidEmail('contato@')).toBe(false);
	});

	it('rejects an email with spaces', () => {
		expect(isValidEmail('con tato@empresa.com')).toBe(false);
	});

	it('trims surrounding whitespace before validating', () => {
		expect(isValidEmail('  contato@empresa.com  ')).toBe(true);
	});
});

describe('isValidPhone', () => {
	it('accepts a 10-digit landline number', () => {
		expect(isValidPhone('(11) 3322-4455')).toBe(true);
	});

	it('accepts an 11-digit mobile number', () => {
		expect(isValidPhone('(11) 98765-4321')).toBe(true);
	});

	it('rejects a number with fewer than 10 digits', () => {
		expect(isValidPhone('(11) 322-4455')).toBe(false);
	});

	it('rejects a number with more than 11 digits', () => {
		expect(isValidPhone('(11) 98765-43219')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(isValidPhone('')).toBe(false);
	});
});
