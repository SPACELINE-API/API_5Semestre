import { expect, test } from '@playwright/test';
import {
	getNotificationListMode,
	getNotificationPreview,
	isNotificationRead,
} from './notificationPresentation';
import type { Notification } from '../types/notification';

const notification = (id: string, readAt: string | null): Notification => ({
	id,
	title: `Notificação ${id}`,
	message: 'Mensagem de teste',
	event_type: 'document_received',
	related_type: 'service_order_file',
	related_id: id,
	read_at: readAt,
	created_at: '2026-11-09T12:00:00Z',
});

test.describe('notification presentation', () => {
	test('uses a native virtualized list for native notification popups', () => {
		expect(getNotificationListMode('native')).toBe('flat-list');
		expect(getNotificationListMode('web')).toBe('scroll-view');
	});

	test('limits the bell preview to six notifications', () => {
		const notifications = Array.from({ length: 8 }, (_, index) =>
			notification(String(index), null),
		);

		expect(getNotificationPreview(notifications)).toHaveLength(6);
		expect(getNotificationPreview(notifications)[0]?.id).toBe('0');
		expect(getNotificationPreview(notifications)[5]?.id).toBe('5');
	});

	test('identifies read and unread notifications from read_at', () => {
		expect(isNotificationRead(notification('unread', null))).toBe(false);
		expect(
			isNotificationRead(notification('read', '2026-11-09T13:00:00Z')),
		).toBe(true);
	});
});
