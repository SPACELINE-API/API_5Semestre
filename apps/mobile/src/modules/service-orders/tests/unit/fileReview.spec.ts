import { test, expect } from '@playwright/test';
import type {
	FileReviewStatus,
	ServiceOrderFile,
	ServiceOrderItem,
} from '../../types/serviceOrder';
import {
	approvedDeliveries,
	canFinalizeOrder,
	countApprovedDeliveries,
	canCompleteOrder,
	currentOutputDeliveries,
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

	test('keeps the action available to finalize already sent deliveries', () => {
		expect(
			canCompleteOrder(
				'em_andamento',
				[
					file('a', {
						service_order_item_id: 'item-0',
						delivery_status: 'sent',
					}),
					file('b', {
						service_order_item_id: 'item-1',
						delivery_status: 'sent',
					}),
				],
				items(2),
			),
		).toBe(true);
	});

	test('allows finalizing a sent order-level file without item links', () => {
		expect(
			canFinalizeOrder(items(1), [
				file('order', {
					service_order_item_id: null,
					delivery_status: 'sent',
				}),
			]),
		).toBe(true);
	});

	test('does not let a later order-level file replace a pending item version', () => {
		const current = currentOutputDeliveries([
			file('old', {
				service_order_item_id: 'item-0',
				uploaded_at: '2026-03-01T10:00:00Z',
				delivery_status: 'sent',
			}),
			file('pending', {
				service_order_item_id: 'item-0',
				uploaded_at: '2026-03-02T10:00:00Z',
				review_status: 'pending',
			}),
			file('order', {
				service_order_item_id: null,
				uploaded_at: '2026-03-03T10:00:00Z',
				delivery_status: 'sent',
			}),
		]);
		expect(current.map(({ id }) => id)).toEqual(['order', 'pending']);
		expect(
			canFinalizeOrder(items(1), [
				file('old', {
					service_order_item_id: 'item-0',
					uploaded_at: '2026-03-01T10:00:00Z',
					delivery_status: 'sent',
				}),
				file('pending', {
					service_order_item_id: 'item-0',
					uploaded_at: '2026-03-02T10:00:00Z',
					review_status: 'pending',
				}),
				file('order', {
					service_order_item_id: null,
					uploaded_at: '2026-03-03T10:00:00Z',
					delivery_status: 'sent',
				}),
			]),
		).toBe(false);
	});

	test('hides the action when there are no approved deliveries to send', () => {
		expect(
			canCompleteOrder('em_analise', [
				file('a', { review_status: 'changes_requested' }),
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
