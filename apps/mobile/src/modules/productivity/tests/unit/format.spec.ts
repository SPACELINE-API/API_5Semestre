import { test, expect } from '@playwright/test';
import { formatDays, formatIsoDate, formatPercent } from '../../utils/format';

test.describe('productivity formatting', () => {
	test('shows a dash when there is no rate or duration', () => {
		expect(formatPercent(null)).toBe('—');
		expect(formatDays(null)).toBe('—');
	});

	test('formats percentages and durations', () => {
		expect(formatPercent(0.756)).toBe('76%');
		expect(formatDays(2.34)).toBe('2,3 d');
	});

	test('formats ISO dates without timezone shifts', () => {
		expect(formatIsoDate('2026-03-01')).toBe('01/03/2026');
	});
});
