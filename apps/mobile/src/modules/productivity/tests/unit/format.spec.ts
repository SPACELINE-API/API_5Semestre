import { test, expect } from '@playwright/test';
import {
	formatCompact,
	formatDays,
	formatIsoDate,
	formatPercent,
} from '../../utils/format';

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

	test('abbreviates thousands and millions without Intl compact notation', () => {
		expect(formatCompact(0)).toBe('0');
		expect(formatCompact(7)).toBe('7');
		expect(formatCompact(999)).toBe('999');
		expect(formatCompact(1000)).toBe('1 mil');
		expect(formatCompact(12400)).toBe('12,4 mil');
		expect(formatCompact(2500000)).toBe('2,5 mi');
	});
});
