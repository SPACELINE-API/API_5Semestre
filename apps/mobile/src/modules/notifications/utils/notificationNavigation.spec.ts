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

const eventNotification = (
	eventType: string,
	relatedType: string,
): Notification => ({
	...notification(relatedType),
	event_type: eventType,
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

test('maps certificate received notifications to the translators screen', () => {
	expect(
		notificationRoute(eventNotification('certificate_received', 'certificate')),
	).toBe('/tradutores');
});

test('maps certificate review notifications to the current user profile', () => {
	expect(
		notificationRoute(eventNotification('certificate_approved', 'certificate')),
	).toBe('/meu-perfil');
	expect(
		notificationRoute(eventNotification('certificate_rejected', 'certificate')),
	).toBe('/meu-perfil');
});

test('maps service order completion notifications to the order details screen', () => {
	expect(
		notificationRoute(
			eventNotification('service_order_completed', 'service_order'),
		),
	).toBe('/ordens-de-servico/related-1');
});

test('maps document notifications to the service orders screen', () => {
	for (const eventType of [
		'document_received',
		'document_approved',
		'document_changes_requested',
	]) {
		expect(
			notificationRoute(eventNotification(eventType, 'service_order_file')),
		).toBe('/ordens-de-servico');
	}
});

test('does not navigate unknown notification types', () => {
	expect(notificationRoute(notification('unknown'))).toBeNull();
});
