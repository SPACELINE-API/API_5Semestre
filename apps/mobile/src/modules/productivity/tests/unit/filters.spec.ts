import { test, expect } from '@playwright/test';
import {
	activePreset,
	buildQueryString,
	defaultFilters,
	isValidPeriod,
	rangeForPreset,
	toIsoDate,
} from '../../utils/filters';

const TODAY = new Date(2026, 2, 15);

test.describe('period presets', () => {
	test('formats local dates as ISO', () => {
		expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
	});

	test('builds ranges ending today', () => {
		expect(rangeForPreset('7d', TODAY)).toEqual({
			dateFrom: '2026-03-08',
			dateTo: '2026-03-15',
		});
		expect(rangeForPreset('30d', TODAY)).toEqual({
			dateFrom: '2026-02-13',
			dateTo: '2026-03-15',
		});
		expect(rangeForPreset('90d', TODAY).dateFrom).toBe('2025-12-15');
	});

	test('current month starts on the first day', () => {
		expect(rangeForPreset('month', TODAY)).toEqual({
			dateFrom: '2026-03-01',
			dateTo: '2026-03-15',
		});
	});

	test('defaults to the last 30 days without selections', () => {
		expect(defaultFilters(TODAY)).toEqual({
			dateFrom: '2026-02-13',
			dateTo: '2026-03-15',
			translatorId: '',
			serviceOrderId: '',
		});
	});

	test('detects which preset is active', () => {
		expect(activePreset(rangeForPreset('90d', TODAY), TODAY)).toBe('90d');
		expect(
			activePreset({ dateFrom: '2026-03-02', dateTo: '2026-03-15' }, TODAY),
		).toBeNull();
	});
});

test.describe('period validation and query string', () => {
	test('accepts equal or ordered dates and rejects inverted ones', () => {
		expect(
			isValidPeriod({ dateFrom: '2026-03-01', dateTo: '2026-03-01' }),
		).toBe(true);
		expect(
			isValidPeriod({ dateFrom: '2026-03-02', dateTo: '2026-03-01' }),
		).toBe(false);
		expect(isValidPeriod({ dateFrom: '', dateTo: '2026-03-01' })).toBe(false);
	});

	test('omits empty filters from the query string', () => {
		expect(buildQueryString(defaultFilters(TODAY))).toBe(
			'date_from=2026-02-13&date_to=2026-03-15',
		);
	});

	test('includes professional and project when selected', () => {
		expect(
			buildQueryString({
				dateFrom: '2026-03-01',
				dateTo: '2026-03-15',
				translatorId: 'abc',
				serviceOrderId: 'def',
			}),
		).toBe(
			'date_from=2026-03-01&date_to=2026-03-15&translator_id=abc&service_order_id=def',
		);
	});
});
