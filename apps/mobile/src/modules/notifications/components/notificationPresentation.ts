import type { Notification } from '../types/notification';

export const NOTIFICATION_PREVIEW_LIMIT = 6;

export function getNotificationPreview(
	notifications: Notification[],
): Notification[] {
	return notifications.slice(0, NOTIFICATION_PREVIEW_LIMIT);
}

export function isNotificationRead(notification: Notification): boolean {
	return notification.read_at !== null;
}
