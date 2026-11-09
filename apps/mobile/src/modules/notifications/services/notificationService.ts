import { apiGetAuth, apiPatchAuth } from '../../../shared/services/apiClient';
import type {
	Notification,
	NotificationListResponse,
	UnreadCountResponse,
} from '../types/notification';

export function listNotifications(page = 1, pageSize = 20) {
	return apiGetAuth<NotificationListResponse>(
		`/api/notifications?page=${page}&page_size=${pageSize}`,
	);
}

export function listRecentNotifications() {
	return listNotifications(1, 6);
}

export function getUnreadNotificationCount() {
	return apiGetAuth<UnreadCountResponse>('/api/notifications/unread-count');
}

export function markNotificationAsRead(notificationId: string) {
	return apiPatchAuth<Notification, Record<string, never>>(
		`/api/notifications/${notificationId}/read`,
		{},
	);
}
