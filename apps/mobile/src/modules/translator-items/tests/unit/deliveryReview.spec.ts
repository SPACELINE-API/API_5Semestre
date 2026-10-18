import { test, expect } from '@playwright/test';
import type {
	DeliveredFile,
	DeliveredFileReviewStatus,
} from '../../types/item';
import {
	canSendDelivery,
	pendingChangesRequest,
} from '../../utils/deliveryReview';

function delivered(
	id: string,
	review_status: DeliveredFileReviewStatus,
	uploaded_at: string,
	review_note: string | null = null,
): DeliveredFile {
	return {
		id,
		filename: `${id}.pdf`,
		file_url: `https://files.example/${id}.pdf`,
		review_status,
		review_note,
		reviewed_at: null,
		uploaded_at,
	};
}

test.describe('pendingChangesRequest', () => {
	test('returns the latest delivery when changes were requested', () => {
		const files = [
			delivered('v1', 'changes_requested', '2026-03-02T10:00:00Z', 'Revisar'),
		];

		expect(pendingChangesRequest(files)?.review_note).toBe('Revisar');
	});

	test('is cleared once a newer version was delivered', () => {
		const files = [
			delivered('v1', 'changes_requested', '2026-03-02T10:00:00Z', 'Revisar'),
			delivered('v2', 'pending', '2026-03-03T10:00:00Z'),
		];

		expect(pendingChangesRequest(files)).toBeNull();
	});

	test('is empty when the delivery was approved or nothing was sent', () => {
		expect(
			pendingChangesRequest([
				delivered('v1', 'approved', '2026-03-02T10:00:00Z'),
			]),
		).toBeNull();
		expect(pendingChangesRequest([])).toBeNull();
	});
});

test.describe('canSendDelivery', () => {
	test('allows the first delivery', () => {
		expect(canSendDelivery([])).toBe(true);
	});

	test('blocks a new delivery while the latest one is pending or approved', () => {
		expect(
			canSendDelivery([delivered('v1', 'pending', '2026-03-02T10:00:00Z')]),
		).toBe(false);
		expect(
			canSendDelivery([delivered('v1', 'approved', '2026-03-02T10:00:00Z')]),
		).toBe(false);
	});

	test('allows a new delivery only when the latest one needs changes', () => {
		expect(
			canSendDelivery([
				delivered('v1', 'changes_requested', '2026-03-02T10:00:00Z', 'Revisar'),
			]),
		).toBe(true);
		expect(
			canSendDelivery([
				delivered('v1', 'changes_requested', '2026-03-02T10:00:00Z', 'Revisar'),
				delivered('v2', 'pending', '2026-03-03T10:00:00Z'),
			]),
		).toBe(false);
	});
});
