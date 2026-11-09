import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useNotificationsStore } from '../hooks/useNotificationsStore';
import { notificationRoute } from '../utils/notificationNavigation';
import type { Notification } from '../types/notification';
import { NotificationCard } from './NotificationCard';

type NotificationCenterProps = {
	topOffset: number;
};

export function NotificationCenter({ topOffset }: NotificationCenterProps) {
	const router = useRouter();
	const { width: windowWidth } = useWindowDimensions();
	const [previewOpen, setPreviewOpen] = useState(false);
	const {
		recentNotifications,
		unreadCount,
		isLoading,
		hasLoadedPreview,
		error,
		refresh,
		markAsRead,
		startPolling,
		stopPolling,
	} = useNotificationsStore();

	useEffect(() => {
		startPolling();
		return stopPolling;
	}, [startPolling, stopPolling]);

	async function togglePreview() {
		if (previewOpen) {
			setPreviewOpen(false);
			return;
		}
		setPreviewOpen(true);
		await refresh();
	}

	async function handleOpen(notification: Notification) {
		if (!notification.read_at) {
			try {
				await markAsRead(notification.id);
			} catch {
				return;
			}
		}
		const route = notificationRoute(notification);
		if (route) {
			setPreviewOpen(false);
			router.push(route);
		}
	}

	async function handleMarkAsRead(notification: Notification) {
		await markAsRead(notification.id).catch(() => undefined);
	}

	return (
		<View pointerEvents="box-none" className="flex-1">
			{previewOpen && (
				<Pressable
					onPress={() => setPreviewOpen(false)}
					accessibilityRole="button"
					accessibilityLabel="Fechar notificações"
					className="absolute inset-0"
				/>
			)}
			<View style={{ top: topOffset, right: 20 }} className="absolute z-50">
				<TouchableOpacity
					onPress={() => void togglePreview()}
					accessibilityRole="button"
					accessibilityLabel={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
					className="relative h-12 w-12 items-center justify-center rounded-full border border-gray-300 bg-white shadow-md hover:bg-gray-50"
				>
					<Bell size={21} color="#374151" />
					{unreadCount > 0 && (
						<View className="absolute left-0 top-0 h-5 w-5 items-center justify-center rounded-full bg-red-600">
							<Text className="font-inter font-bold text-[10px] text-white">
								{unreadCount > 9 ? '9+' : unreadCount}
							</Text>
						</View>
					)}
				</TouchableOpacity>

				{previewOpen && (
					<View
						style={{ width: Math.min(360, Math.max(280, windowWidth - 32)) }}
						className="absolute right-0 top-14 z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
					>
						<View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3">
							<Text className="font-inter font-bold text-gray-900 text-base">
								Notificações
							</Text>
						</View>
						<ScrollView
							className="max-h-[480px]"
							contentContainerClassName="gap-3 p-4"
							showsVerticalScrollIndicator={false}
						>
							{isLoading && !hasLoadedPreview && (
								<ActivityIndicator color="#2563EB" />
							)}
							{!isLoading && error && (
								<Text className="font-inter text-red-700 text-sm">{error}</Text>
							)}
							{!isLoading && !error && recentNotifications.length === 0 && (
								<Text className="font-inter text-center text-gray-500 text-sm">
									Você não possui notificações.
								</Text>
							)}
							{recentNotifications.map((notification) => (
								<NotificationCard
									key={notification.id}
									notification={notification}
									onOpen={handleOpen}
									onMarkAsRead={handleMarkAsRead}
								/>
							))}
						</ScrollView>
					</View>
				)}
			</View>
		</View>
	);
}
