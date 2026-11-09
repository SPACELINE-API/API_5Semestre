import type { Href } from 'expo-router';
import type { Notification } from '../types/notification';

export function notificationRoute(notification: Notification): Href | null {
	if (!notification.related_id) return null;
	if (notification.related_type === 'certificate') {
		if (notification.event_type === 'certificate_received') {
			return '/tradutores' as Href;
		}
		if (notification.event_type === 'certificate_rejected') {
			return '/meu-perfil' as Href;
		}
		return null;
	}
	if (
		notification.related_type === 'translator' &&
		notification.event_type === 'certificate_received'
	) {
		return `/tradutores/${encodeURIComponent(notification.related_id)}?tab=requests` as Href;
	}
	if (notification.related_type === 'service_order_file') {
		return '/ordens-de-servico' as Href;
	}
	if (notification.related_type === 'document') {
		return '/ordens-de-servico' as Href;
	}
	if (notification.related_type === 'quote') {
		return `/orcamento?quoteId=${encodeURIComponent(notification.related_id)}` as Href;
	}
	if (notification.related_type === 'service_order') {
		return `/ordens-de-servico/${encodeURIComponent(notification.related_id)}` as Href;
	}
	if (notification.related_type === 'service_order_item_invite') {
		return `/convites/${encodeURIComponent(notification.related_id)}` as Href;
	}
	return null;
}
