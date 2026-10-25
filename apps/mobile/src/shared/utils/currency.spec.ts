import { expect, test } from '@playwright/test';
import { decimalStringToBRL, maskCurrencyDigits } from './currency';

test.describe('currency formatting', () => {
	test('inserts cents while masking currency digits', () => {
		expect(maskCurrencyDigits('1')).toBe('0.01');
		expect(maskCurrencyDigits('1234')).toBe('12.34');
	});

	test('formats the masked value as BRL', () => {
		expect(decimalStringToBRL('12.34')).toBe('R$ 12,34');
	});
});
