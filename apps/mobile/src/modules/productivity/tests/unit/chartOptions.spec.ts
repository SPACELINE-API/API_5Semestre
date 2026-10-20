import { test, expect } from '@playwright/test';
import type {
	ProductivityDocument,
	ProductivityIndicators,
	TranslatorProductivity,
} from '../../types/productivity';
import {
	groupDocumentsByDay,
	hasPunctualityData,
	punctualityByTranslatorOption,
	punctualityDonutOption,
	rankingOption,
	timelineOption,
	topRows,
} from '../../utils/chartOptions';

function row(
	name: string,
	overrides: Partial<TranslatorProductivity> = {},
): TranslatorProductivity {
	return {
		translator_id: name,
		translator_name: name,
		documents_translated: 1,
		total_words: 100,
		total_value: '50.00',
		projects_count: 1,
		on_time_documents: 1,
		late_documents: 0,
		on_time_rate: 1,
		average_turnaround_days: 2,
		...overrides,
	};
}

function summary(
	overrides: Partial<ProductivityIndicators> = {},
): ProductivityIndicators {
	return {
		documents_translated: 4,
		total_words: 400,
		total_value: '200.00',
		projects_count: 2,
		on_time_documents: 3,
		late_documents: 1,
		on_time_rate: 0.75,
		average_turnaround_days: 3,
		...overrides,
	};
}

function document(
	completedAt: string | null,
	words: number | null,
): ProductivityDocument {
	return {
		item_id: `${completedAt}-${words}`,
		service_order_id: 'order',
		project_name: 'Projeto',
		source_language: 'pt-BR',
		target_language: 'en-US',
		document_type: null,
		word_count: words,
		price: null,
		deadline: null,
		completed_at: completedAt,
		on_time: null,
		original_file_url: null,
		delivered_files: [],
	};
}

type Series = { data: number[]; name: string };

test.describe('ranking chart', () => {
	test('orders professionals by the selected metric and keeps the top rows', () => {
		const rows = [
			row('Ana', { documents_translated: 2, total_words: 900 }),
			row('Bia', { documents_translated: 5, total_words: 100 }),
			row('Caio', { documents_translated: 3, total_words: 500 }),
		];

		expect(topRows(rows, 'documents', 2).map((r) => r.translator_name)).toEqual(
			['Bia', 'Caio'],
		);
		expect(topRows(rows, 'words').map((r) => r.translator_name)).toEqual([
			'Ana',
			'Caio',
			'Bia',
		]);
	});

	test('breaks ties alphabetically', () => {
		const rows = [row('Zeca'), row('Ana')];

		expect(topRows(rows, 'documents').map((r) => r.translator_name)).toEqual([
			'Ana',
			'Zeca',
		]);
	});

	test('maps the monetary metric from the decimal string', () => {
		const option = rankingOption(
			[row('Ana', { total_value: '150.50' })],
			'value',
		) as { series: Series[]; yAxis: { data: string[] } };

		expect(option.series[0].data).toEqual([150.5]);
		expect(option.yAxis.data).toEqual(['Ana']);
	});
});

test.describe('punctuality charts', () => {
	test('has no donut when no document has a deadline', () => {
		const empty = summary({
			on_time_documents: 0,
			late_documents: 0,
			on_time_rate: null,
		});

		expect(hasPunctualityData(empty)).toBe(false);
		expect(punctualityDonutOption(empty)).toBeNull();
	});

	test('donut slices carry on time and late counts', () => {
		const option = punctualityDonutOption(summary()) as {
			series: { data: { name: string; value: number }[] }[];
			title: { text: string };
		};

		expect(option.series[0].data).toEqual([
			expect.objectContaining({ name: 'No prazo', value: 3 }),
			expect.objectContaining({ name: 'Atrasados', value: 1 }),
		]);
		expect(option.title.text).toBe('75%');
	});

	test('stacked bars split on time and late per professional', () => {
		const option = punctualityByTranslatorOption([
			row('Ana', {
				documents_translated: 3,
				on_time_documents: 2,
				late_documents: 1,
			}),
			row('Bia', {
				documents_translated: 1,
				on_time_documents: 1,
				late_documents: 0,
			}),
		]) as { series: Series[] };

		expect(option.series.map((series) => series.name)).toEqual([
			'No prazo',
			'Atrasados',
		]);
		expect(option.series[0].data).toEqual([2, 1]);
		expect(option.series[1].data).toEqual([1, 0]);
	});
});

test.describe('timeline chart', () => {
	test('groups completed documents by day in order', () => {
		const days = groupDocumentsByDay([
			document('2026-03-10T15:00:00Z', 100),
			document('2026-03-09T15:00:00Z', 50),
			document('2026-03-10T16:00:00Z', null),
			document(null, 999),
		]);

		expect(days).toEqual([
			{ date: '2026-03-09', documents: 1, words: 50 },
			{ date: '2026-03-10', documents: 2, words: 100 },
		]);
	});

	test('uses the Sao Paulo day for late night completions', () => {
		const days = groupDocumentsByDay([document('2026-03-10T01:30:00Z', 10)]);

		expect(days[0].date).toBe('2026-03-09');
	});

	test('builds a bar and a line series', () => {
		const option = timelineOption([
			{ date: '2026-03-09', documents: 1, words: 50 },
			{ date: '2026-03-10', documents: 2, words: 100 },
		]) as { series: (Series & { type: string })[]; xAxis: { data: string[] } };

		expect(option.xAxis.data).toEqual(['09/03', '10/03']);
		expect(option.series.map((series) => series.type)).toEqual(['bar', 'line']);
		expect(option.series[1].data).toEqual([50, 100]);
	});
});
