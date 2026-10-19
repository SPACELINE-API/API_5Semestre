import { test, expect } from '@playwright/test';
import type {
	FileReviewStatus,
	ServiceOrderFile,
	ServiceOrderItem,
} from '../../types/serviceOrder';
import {
	approvedDeliveries,
	countApprovedDeliveries,
	canCompleteOrder,
	pendingReviewDeliveries,
	reviewableFiles,
	reviewedDeliveries,
} from '../../utils/fileReview';

function file(
	id: string,
	overrides: Partial<ServiceOrderFile> = {},
): ServiceOrderFile {
	return {
		id,
		service_order_id: 'order',
		service_order_item_id: `item-${id}`,
		filename: `${id}.pdf`,
		file_url: `https://files.example/${id}.pdf`,
		direction: 'saida',
		delivery_status: 'not_sent',
		review_status: 'approved' as FileReviewStatus,
		review_note: null,
		reviewed_at: null,
		uploaded_at: '2026-03-01T10:00:00Z',
		...overrides,
	};
}

function items(count: number): ServiceOrderItem[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `item-${index}`,
	})) as unknown as ServiceOrderItem[];
}

test.describe('delivery review helpers', () => {
	test('only approved deliveries count as delivered', () => {
		const files = [
			file('a'),
			file('b', { review_status: 'pending' }),
			file('c', { review_status: 'changes_requested' }),
			file('d', { direction: 'entrada' }),
		];

		expect(approvedDeliveries(files).map((item) => item.id)).toEqual(['a']);
		expect(countApprovedDeliveries(files, items(4))).toBe(1);
	});

	test('the counter never exceeds the number of items', () => {
		const files = [file('a'), file('b'), file('c')];

		expect(countApprovedDeliveries(files, items(2))).toBe(2);
	});

	test('lists the deliveries waiting for review', () => {
		const files = [
			file('a'),
			file('b', { review_status: 'pending' }),
			file('c', { review_status: 'pending', direction: 'entrada' }),
		];

		expect(pendingReviewDeliveries(files).map((item) => item.id)).toEqual([
			'b',
		]);
	});

	test('history keeps reviewed translator deliveries only', () => {
		const files = [
			file('approved'),
			file('changes', { review_status: 'changes_requested' }),
			file('pending', { review_status: 'pending' }),
			file('staff', { service_order_item_id: null }),
		];

		expect(reviewedDeliveries(files).map((item) => item.id)).toEqual([
			'approved',
			'changes',
		]);
	});

	test('reviewable files are translator deliveries, newest first', () => {
		const files = [
			file('old', { uploaded_at: '2026-03-01T10:00:00Z' }),
			file('new', { uploaded_at: '2026-03-05T10:00:00Z' }),
			file('staff', { service_order_item_id: null }),
		];

		expect(reviewableFiles(files).map((item) => item.id)).toEqual([
			'new',
			'old',
		]);
	});
});

test.describe('canCompleteOrder', () => {
	test('hides the action once the order is concluded', () => {
		expect(canCompleteOrder('concluida', [])).toBe(false);
		expect(canCompleteOrder('concluida', [file('a')])).toBe(false);
	});

	test('shows the action while the order is not concluded', () => {
		expect(canCompleteOrder('em_andamento', [])).toBe(true);
		expect(canCompleteOrder('em_analise', [file('a')])).toBe(true);
	});

	test('hides the action once every delivery was sent', () => {
		expect(
			canCompleteOrder('em_andamento', [
				file('a', { delivery_status: 'sent' }),
				file('b', { delivery_status: 'sent' }),
			]),
		).toBe(false);
	});

	test('ignores incoming client files', () => {
		expect(
			canCompleteOrder('em_analise', [
				file('a', { delivery_status: 'sent' }),
				file('b', { direction: 'entrada' }),
			]),
		).toBe(false);
	});
});
