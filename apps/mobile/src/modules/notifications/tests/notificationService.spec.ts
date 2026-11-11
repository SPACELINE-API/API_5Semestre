import { expect, test } from '@playwright/test';
import {
	getUnreadNotificationCount,
	listRecentNotifications,
	markNotificationAsRead,
} from '../services/notificationService';

test.describe('Notification service', () => {
	test('lists all notifications available for the scrollable preview', async () => {
		let requestedUrl = '';
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (input) => {
			requestedUrl = String(input);
			return {
				ok: true,
					json: async () => ({ items: [], total: 0, page: 1, page_size: 100 }),
			} as Response;
		};

		try {
			await listRecentNotifications();
			expect(requestedUrl).toContain('/api/notifications?page=1&page_size=100');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('gets unread count', async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async () =>
			({ ok: true, json: async () => ({ count: 3 }) }) as Response;

		try {
			expect((await getUnreadNotificationCount()).count).toBe(3);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('marks a notification as read', async () => {
		let requestInit: RequestInit | undefined;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = async (_input, init) => {
			requestInit = init;
			return {
				ok: true,
				json: async () => ({
					id: 'notification-1',
					read_at: '2026-11-09T12:00:00Z',
				}),
			} as Response;
		};

		try {
			await markNotificationAsRead('notification-1');
			expect(requestInit?.method).toBe('PATCH');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
