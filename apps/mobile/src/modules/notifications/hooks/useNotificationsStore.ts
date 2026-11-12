import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { onSessionChange } from '../../auth/services/auth';
import { ApiError } from '../../../shared/services/publicApiClient';
import {
	getUnreadNotificationCount,
	listNotifications,
	listRecentNotifications,
	markNotificationAsRead,
} from '../services/notificationService';
import type { Notification } from '../types/notification';

export const NOTIFICATIONS_POLLING_INTERVAL_MS = 30_000;

type NotificationsState = {
	recentNotifications: Notification[];
	notifications: Notification[];
	unreadCount: number;
	isLoading: boolean;
	isLoadingAll: boolean;
	isRefreshing: boolean;
	hasLoadedPreview: boolean;
	error: string | null;
	allLoaded: boolean;
	refresh: () => Promise<void>;
	loadAll: () => Promise<void>;
	markAsRead: (notificationId: string) => Promise<void>;
	startPolling: () => void;
	stopPolling: () => void;
	reset: () => void;
};

const initialState = {
	recentNotifications: [],
	notifications: [],
	unreadCount: 0,
	isLoading: false,
	isLoadingAll: false,
	isRefreshing: false,
	hasLoadedPreview: false,
	error: null,
	allLoaded: false,
};

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let refreshPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown) {
	if (error instanceof ApiError && error.status === 403) {
		return 'Você não tem permissão para consultar suas notificações.';
	}
	return error instanceof Error
		? error.message
		: 'Não foi possível carregar as notificações.';
}

function replaceNotification(
	notifications: Notification[],
	updated: Notification,
): Notification[] {
	return notifications.map((notification) =>
		notification.id === updated.id ? updated : notification,
	);
}

export const useNotificationsStore = create<NotificationsState>()(
	(set, get) => ({
		...initialState,

		refresh: async () => {
			if (refreshPromise) return refreshPromise;

			set({ isRefreshing: true, isLoading: true, error: null });
			refreshPromise = Promise.all([
				listRecentNotifications(),
				getUnreadNotificationCount(),
			])
				.then(([recent, unread]) => {
					set({
						recentNotifications: recent.items,
						unreadCount: unread.count,
						hasLoadedPreview: true,
						isLoading: false,
						isRefreshing: false,
						error: null,
					});
				})
				.catch((error: unknown) => {
					set({
						isLoading: false,
						isRefreshing: false,
						error: getErrorMessage(error),
					});
					throw error;
				})
				.finally(() => {
					refreshPromise = null;
				});

			return refreshPromise;
		},

		loadAll: async () => {
			set({ isLoadingAll: true, error: null });
			try {
				const firstPage = await listNotifications(1, 100);
				const allItems = [...firstPage.items];
				const totalPages = Math.ceil(firstPage.total / firstPage.page_size);
				for (let page = 2; page <= totalPages; page += 1) {
					const nextPage = await listNotifications(page, 100);
					allItems.push(...nextPage.items);
				}
				const unread = await getUnreadNotificationCount();
				set({
					notifications: allItems,
					unreadCount: unread.count,
					allLoaded: true,
					isLoadingAll: false,
					error: null,
				});
			} catch (error: unknown) {
				set({ isLoadingAll: false, error: getErrorMessage(error) });
				throw error;
			}
		},

		markAsRead: async (notificationId) => {
			const current = [
				...get().recentNotifications,
				...get().notifications,
			].find((notification) => notification.id === notificationId);
			if (current?.read_at) return;

			try {
				const updated = await markNotificationAsRead(notificationId);
				set((state) => ({
					recentNotifications: replaceNotification(
						state.recentNotifications,
						updated,
					),
					notifications: replaceNotification(state.notifications, updated),
					unreadCount: Math.max(0, state.unreadCount - 1),
				}));
			} catch (error: unknown) {
				set({ error: getErrorMessage(error) });
				throw error;
			}
		},

		startPolling: () => {
			if (pollingTimer) return;
			void get()
				.refresh()
				.catch(() => undefined);
			pollingTimer = setInterval(() => {
				void get()
					.refresh()
					.catch(() => undefined);
			}, NOTIFICATIONS_POLLING_INTERVAL_MS);
			appStateSubscription = AppState.addEventListener(
				'change',
				(status: AppStateStatus) => {
					if (status === 'active') {
						void get()
							.refresh()
							.catch(() => undefined);
					}
				},
			);
		},

		stopPolling: () => {
			if (!pollingTimer) return;
			clearInterval(pollingTimer);
			pollingTimer = null;
			appStateSubscription?.remove();
			appStateSubscription = null;
		},

		reset: () => {
			get().stopPolling();
			set(initialState);
		},
	}),
);

onSessionChange((userId) => {
	useNotificationsStore.getState().reset();
	if (userId) {
		useNotificationsStore.getState().startPolling();
	}
});
