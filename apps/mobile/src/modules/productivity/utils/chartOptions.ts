import type { ChartOption } from '../../../shared/components/charts/types';
import type {
	ChartMetric,
	ProductivityDocument,
	ProductivityIndicators,
	TranslatorProductivity,
} from '../types/productivity';
import {
	formatCompact,
	formatCurrencyValue,
	formatInteger,
	formatPercent,
} from './format';

export const CHART_COLORS = {
	primary: '#1C6FB0',
	primaryLight: '#89C6FF',
	onTime: '#1D9E75',
	late: '#D9534F',
	text: '#353535',
	muted: '#8A8A8A',
	grid: '#F0F0F0',
};

export const METRIC_LABELS: Record<ChartMetric, string> = {
	documents: 'Documentos',
	words: 'Palavras',
	value: 'Valor',
};

const TEXT_STYLE = { fontFamily: 'Inter', color: CHART_COLORS.text };

const BAR_GRID = { left: 8, right: 24, top: 8, bottom: 8, containLabel: true };

const CATEGORY_LABEL = {
	...TEXT_STYLE,
	fontSize: 12,
	width: 96,
	overflow: 'truncate' as const,
};

export function metricValue(
	row: TranslatorProductivity,
	metric: ChartMetric,
): number {
	if (metric === 'documents') return row.documents_translated;
	if (metric === 'words') return row.total_words;
	return Number(row.total_value);
}

export function formatMetric(value: number, metric: ChartMetric): string {
	return metric === 'value' ? formatCurrencyValue(value) : formatInteger(value);
}

export function topRows(
	rows: TranslatorProductivity[],
	metric: ChartMetric,
	limit = 8,
): TranslatorProductivity[] {
	return [...rows]
		.sort(
			(a, b) =>
				metricValue(b, metric) - metricValue(a, metric) ||
				a.translator_name.localeCompare(b.translator_name, 'pt-BR'),
		)
		.slice(0, limit);
}

export function rankingOption(
	rows: TranslatorProductivity[],
	metric: ChartMetric,
	limit = 8,
): ChartOption {
	const ranked = topRows(rows, metric, limit);

	return {
		textStyle: TEXT_STYLE,
		grid: BAR_GRID,
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			confine: true,
			valueFormatter: (value: unknown) => formatMetric(Number(value), metric),
		},
		xAxis: {
			type: 'value',
			axisLabel: {
				...TEXT_STYLE,
				fontSize: 11,
				formatter: (value: number) => formatCompact(value),
			},
			splitLine: { lineStyle: { color: CHART_COLORS.grid } },
		},
		yAxis: {
			type: 'category',
			inverse: true,
			data: ranked.map((row) => row.translator_name),
			axisLabel: CATEGORY_LABEL,
			axisLine: { show: false },
			axisTick: { show: false },
		},
		series: [
			{
				name: METRIC_LABELS[metric],
				type: 'bar',
				barMaxWidth: 22,
				data: ranked.map((row) => metricValue(row, metric)),
				itemStyle: { color: CHART_COLORS.primary, borderRadius: [0, 4, 4, 0] },
			},
		],
	};
}

export function hasPunctualityData(
	summary: Pick<ProductivityIndicators, 'on_time_documents' | 'late_documents'>,
): boolean {
	return summary.on_time_documents + summary.late_documents > 0;
}

export function punctualityDonutOption(
	summary: ProductivityIndicators,
): ChartOption | null {
	if (!hasPunctualityData(summary)) return null;

	return {
		textStyle: TEXT_STYLE,
		tooltip: { trigger: 'item', confine: true },
		legend: {
			bottom: 0,
			icon: 'circle',
			textStyle: { ...TEXT_STYLE, fontSize: 12 },
		},
		title: {
			text: formatPercent(summary.on_time_rate),
			subtext: 'no prazo',
			left: 'center',
			top: '34%',
			textStyle: { ...TEXT_STYLE, fontSize: 26, fontWeight: 'bold' },
			subtextStyle: { ...TEXT_STYLE, color: CHART_COLORS.muted, fontSize: 12 },
		},
		series: [
			{
				type: 'pie',
				radius: ['56%', '78%'],
				center: ['50%', '46%'],
				avoidLabelOverlap: true,
				label: { show: false },
				itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 },
				data: [
					{
						name: 'No prazo',
						value: summary.on_time_documents,
						itemStyle: { color: CHART_COLORS.onTime },
					},
					{
						name: 'Atrasados',
						value: summary.late_documents,
						itemStyle: { color: CHART_COLORS.late },
					},
				],
			},
		],
	};
}

export function punctualityByTranslatorOption(
	rows: TranslatorProductivity[],
	limit = 8,
): ChartOption {
	const ranked = topRows(rows, 'documents', limit);

	return {
		textStyle: TEXT_STYLE,
		grid: { ...BAR_GRID, bottom: 36 },
		legend: {
			bottom: 0,
			icon: 'circle',
			textStyle: { ...TEXT_STYLE, fontSize: 12 },
		},
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			confine: true,
		},
		xAxis: {
			type: 'value',
			minInterval: 1,
			axisLabel: { ...TEXT_STYLE, fontSize: 11 },
			splitLine: { lineStyle: { color: CHART_COLORS.grid } },
		},
		yAxis: {
			type: 'category',
			inverse: true,
			data: ranked.map((row) => row.translator_name),
			axisLabel: CATEGORY_LABEL,
			axisLine: { show: false },
			axisTick: { show: false },
		},
		series: [
			{
				name: 'No prazo',
				type: 'bar',
				stack: 'delivery',
				barMaxWidth: 22,
				data: ranked.map((row) => row.on_time_documents),
				itemStyle: { color: CHART_COLORS.onTime },
			},
			{
				name: 'Atrasados',
				type: 'bar',
				stack: 'delivery',
				barMaxWidth: 22,
				data: ranked.map((row) => row.late_documents),
				itemStyle: { color: CHART_COLORS.late },
			},
		],
	};
}

export type DayVolume = { date: string; documents: number; words: number };

export function dayKey(value: string): string {
	return new Date(value).toLocaleDateString('en-CA', {
		timeZone: 'America/Sao_Paulo',
	});
}

export function groupDocumentsByDay(
	documents: ProductivityDocument[],
): DayVolume[] {
	const days = new Map<string, DayVolume>();

	for (const document of documents) {
		if (!document.completed_at) continue;
		const key = dayKey(document.completed_at);
		const day = days.get(key) ?? { date: key, documents: 0, words: 0 };
		day.documents += 1;
		day.words += document.word_count ?? 0;
		days.set(key, day);
	}

	return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function shortDate(isoDate: string): string {
	const [, month, day] = isoDate.split('-');
	return `${day}/${month}`;
}

export function timelineOption(days: DayVolume[]): ChartOption {
	return {
		textStyle: TEXT_STYLE,
		grid: { left: 8, right: 8, top: 24, bottom: 36, containLabel: true },
		legend: {
			bottom: 0,
			icon: 'circle',
			textStyle: { ...TEXT_STYLE, fontSize: 12 },
		},
		tooltip: { trigger: 'axis', confine: true },
		xAxis: {
			type: 'category',
			data: days.map((day) => shortDate(day.date)),
			axisLabel: { ...TEXT_STYLE, fontSize: 11 },
			axisTick: { show: false },
		},
		yAxis: [
			{
				type: 'value',
				minInterval: 1,
				axisLabel: { ...TEXT_STYLE, fontSize: 11 },
				splitLine: { lineStyle: { color: CHART_COLORS.grid } },
			},
			{
				type: 'value',
				axisLabel: {
					...TEXT_STYLE,
					fontSize: 11,
					formatter: (value: number) => formatCompact(value),
				},
				splitLine: { show: false },
			},
		],
		series: [
			{
				name: 'Documentos',
				type: 'bar',
				barMaxWidth: 28,
				data: days.map((day) => day.documents),
				itemStyle: { color: CHART_COLORS.primary, borderRadius: [4, 4, 0, 0] },
			},
			{
				name: 'Palavras',
				type: 'line',
				yAxisIndex: 1,
				smooth: true,
				symbolSize: 6,
				data: days.map((day) => day.words),
				lineStyle: { color: CHART_COLORS.primaryLight, width: 2 },
				itemStyle: { color: CHART_COLORS.primaryLight },
			},
		],
	};
}
