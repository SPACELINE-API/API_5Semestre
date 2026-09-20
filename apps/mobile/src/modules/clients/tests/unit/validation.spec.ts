import { test, expect } from '@playwright/test';
import {
	isValidCnpjShape,
	isValidEmail,
	isValidPhone,
} from '../../utils/validation';

test.describe('isValidCnpjShape', () => {
	test('accepts a masked 14-character numeric CNPJ', () => {
		expect(isValidCnpjShape('11.222.333/0001-81')).toBe(true);
	});

	test('accepts a raw 14-character alphanumeric CNPJ with numeric check digits', () => {
		expect(isValidCnpjShape('ABCDEFGH000123')).toBe(true);
	});

	test('rejects a CNPJ whose check digits are not numeric', () => {
		expect(isValidCnpjShape('ABCDEFGH00012A')).toBe(false);
	});

	test('rejects a CNPJ with fewer than 14 characters', () => {
		expect(isValidCnpjShape('11.222.333/0001-8')).toBe(false);
	});

	test('rejects a CNPJ with more than 14 characters', () => {
		expect(isValidCnpjShape('11.222.333/0001-819')).toBe(false);
	});

	test('rejects an empty string', () => {
		expect(isValidCnpjShape('')).toBe(false);
	});
});

test.describe('isValidEmail', () => {
	test('accepts a well-formed email', () => {
		expect(isValidEmail('contato@empresa.com')).toBe(true);
	});

	test('rejects an email missing the @', () => {
		expect(isValidEmail('contatoempresa.com')).toBe(false);
	});

	test('rejects an email missing the domain', () => {
		expect(isValidEmail('contato@')).toBe(false);
	});

	test('rejects an email with spaces', () => {
		expect(isValidEmail('con tato@empresa.com')).toBe(false);
	});

	test('trims surrounding whitespace before validating', () => {
		expect(isValidEmail('  contato@empresa.com  ')).toBe(true);
	});
});

test.describe('isValidPhone', () => {
	test('accepts a 10-digit landline number', () => {
		expect(isValidPhone('(11) 3322-4455')).toBe(true);
	});

	test('accepts an 11-digit mobile number', () => {
		expect(isValidPhone('(11) 98765-4321')).toBe(true);
	});

	test('rejects a number with fewer than 10 digits', () => {
		expect(isValidPhone('(11) 322-4455')).toBe(false);
	});

	test('rejects a number with more than 11 digits', () => {
		expect(isValidPhone('(11) 98765-43219')).toBe(false);
	});

	test('rejects an empty string', () => {
		expect(isValidPhone('')).toBe(false);
	});
});
