import { expect, test } from '@playwright/test';
import { formatDateOnly } from './dateOnly';

test.describe('formatDateOnly', () => {
	test('keeps the calendar day of a date-only value', () => {
		expect(formatDateOnly('2026-12-10')).toBe('10/12/2026');
	});

	test('keeps the calendar day of a deadline stored at UTC midnight', () => {
		expect(formatDateOnly('2026-12-10T00:00:00.000Z')).toBe('10/12/2026');
		expect(formatDateOnly('2026-12-10T00:00:00+00:00')).toBe('10/12/2026');
	});

	test('formats the long style with the month name', () => {
		expect(formatDateOnly('2026-11-21', 'long')).toBe('21 de novembro de 2026');
	});

	test('returns an empty string for missing values and the raw text for invalid ones', () => {
		expect(formatDateOnly(null)).toBe('');
		expect(formatDateOnly(undefined)).toBe('');
		expect(formatDateOnly('sem data')).toBe('sem data');
	});
});
