import type { DashboardMetric } from '../types/shortcut';
import type { PeriodKey, PeriodRange } from '../types/overview';

/** Métricas que passam a ser exibidas pelo overview por status. */
const OVERVIEW_ICONS: DashboardMetric['icon'][] = [
	'requests',
	'quotes',
	'service-orders',
];

export function needsAttention(metric: DashboardMetric) {
	return metric.badgeType === 'warning' && Number(metric.value) > 0;
}

/** Métricas que não são cobertas pelo overview (ex.: Clientes). */
export function getSecondaryMetrics(metrics: DashboardMetric[]) {
	return metrics.filter((m) => !OVERVIEW_ICONS.includes(m.icon));
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
	{ key: '7d', label: '7 dias' },
	{ key: '30d', label: '30 dias' },
	{ key: '90d', label: '90 dias' },
	{ key: 'year', label: 'Este ano' },
];

export const DEFAULT_PERIOD: PeriodKey = '30d';

const DAYS: Record<Exclude<PeriodKey, 'year'>, number> = {
	'7d': 7,
	'30d': 30,
	'90d': 90,
};

function toISODate(date: Date) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

export function getPeriodRange(
	key: PeriodKey,
	today: Date = new Date(),
): PeriodRange {
	const start = new Date(today);
	if (key === 'year') {
		start.setMonth(0, 1);
	} else {
		start.setDate(today.getDate() - (DAYS[key] - 1));
	}
	return { start: toISODate(start), end: toISODate(today) };
}

export function formatRange(range: PeriodRange) {
	const fmt = (iso: string) => {
		const [y, m, d] = iso.split('-');
		return `${d}/${m}/${y}`;
	};
	return `${fmt(range.start)} – ${fmt(range.end)}`;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

export function formatCurrency(value: number) {
	return currencyFormatter.format(value);
}
