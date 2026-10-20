import type { ProductivityFilters } from '../types/productivity';

export type PeriodPreset = '7d' | '30d' | '90d' | 'month';

export const PERIOD_PRESETS: { key: PeriodPreset; label: string }[] = [
	{ key: '7d', label: '7 dias' },
	{ key: '30d', label: '30 dias' },
	{ key: '90d', label: '90 dias' },
	{ key: 'month', label: 'Este mês' },
];

export function toIsoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function daysAgo(today: Date, days: number): Date {
	return new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() - days,
	);
}

export function rangeForPreset(
	preset: PeriodPreset,
	today: Date = new Date(),
): Pick<ProductivityFilters, 'dateFrom' | 'dateTo'> {
	const dateTo = toIsoDate(today);

	if (preset === 'month') {
		return {
			dateFrom: toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
			dateTo,
		};
	}

	const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
	return { dateFrom: toIsoDate(daysAgo(today, days)), dateTo };
}

export function defaultFilters(today: Date = new Date()): ProductivityFilters {
	return {
		...rangeForPreset('30d', today),
		translatorId: '',
		serviceOrderId: '',
	};
}

export function activePreset(
	filters: Pick<ProductivityFilters, 'dateFrom' | 'dateTo'>,
	today: Date = new Date(),
): PeriodPreset | null {
	const match = PERIOD_PRESETS.find((preset) => {
		const range = rangeForPreset(preset.key, today);
		return (
			range.dateFrom === filters.dateFrom && range.dateTo === filters.dateTo
		);
	});
	return match?.key ?? null;
}

export function isValidPeriod(
	filters: Pick<ProductivityFilters, 'dateFrom' | 'dateTo'>,
): boolean {
	return Boolean(
		filters.dateFrom && filters.dateTo && filters.dateFrom <= filters.dateTo,
	);
}

export function buildQueryString(filters: ProductivityFilters): string {
	const params: [string, string][] = [
		['date_from', filters.dateFrom],
		['date_to', filters.dateTo],
		['translator_id', filters.translatorId],
		['service_order_id', filters.serviceOrderId],
	];

	return params
		.filter(([, value]) => value)
		.map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
		.join('&');
}

export function hasActiveSelection(filters: ProductivityFilters): boolean {
	return Boolean(filters.translatorId || filters.serviceOrderId);
}
