import type { Href } from 'expo-router';
import type { Notification } from '../types/notification';

export function notificationRoute(notification: Notification): Href | null {
	if (!notification.related_id) return null;
	if (notification.related_type === 'service_order_file') {
		return '/ordens-de-servico' as Href;
	}
	if (notification.related_type === 'quote') {
		return `/orcamento?quoteId=${encodeURIComponent(notification.related_id)}` as Href;
	}
	if (notification.related_type === 'service_order_item_invite') {
		return `/convites/${encodeURIComponent(notification.related_id)}` as Href;
	}
	return null;
}
