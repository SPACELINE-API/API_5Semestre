import { expect, test } from '@playwright/test';
import type { Notification } from '../types/notification';
import { notificationRoute } from './notificationNavigation';

const notification = (relatedType: string | null): Notification => ({
	id: 'notification-1',
	event_type: 'document_received',
	title: 'Documento recebido',
	message: 'Mensagem',
	related_type: relatedType,
	related_id: 'related-1',
	created_at: '2026-11-09T12:00:00Z',
	read_at: null,
});

test('maps service order file notifications to the service orders screen', () => {
	expect(notificationRoute(notification('service_order_file'))).toBe(
		'/ordens-de-servico',
	);
});

test('maps approved quote notifications to the quote filtered by its id', () => {
	expect(notificationRoute(notification('quote'))).toBe(
		'/orcamento?quoteId=related-1',
	);
});

test('maps translator invite notifications to the invite details screen', () => {
	expect(notificationRoute(notification('service_order_item_invite'))).toBe(
		'/convites/related-1',
	);
});

test('does not navigate unknown notification types', () => {
	expect(notificationRoute(notification('unknown'))).toBeNull();
});
