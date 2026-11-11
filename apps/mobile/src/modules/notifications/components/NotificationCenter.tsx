import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
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
import { getNotificationListMode } from './notificationPresentation';

type NotificationCenterProps = { topOffset: number };

type NotificationPanelProps = {
	windowWidth: number;
	isMobile: boolean;
	isNative: boolean;
	notifications: Notification[];
	isLoading: boolean;
	isLoadingAll: boolean;
	hasLoadedPreview: boolean;
	error: string | null;
	onOpen: (notification: Notification) => void;
	onMarkAsRead: (notification: Notification) => void;
};

function NotificationPanel({
	windowWidth,
	isMobile,
	isNative,
	notifications,
	isLoading,
	isLoadingAll,
	hasLoadedPreview,
	error,
	onOpen,
	onMarkAsRead,
}: NotificationPanelProps) {
	const mode = getNotificationListMode(isNative ? 'native' : 'web');
	const width = Math.min(
		isMobile ? 330 : 360,
		Math.max(isMobile ? 260 : 280, windowWidth - (isMobile ? 24 : 32)),
	);
	const status = (
		<>
			{(isLoading || isLoadingAll) && !hasLoadedPreview && (
				<ActivityIndicator color="#2563EB" />
			)}
			{!isLoading && !isLoadingAll && error && (
				<Text className="font-inter text-red-700 text-sm">{error}</Text>
			)}
		</>
	);
	const empty =
		!isLoading && !isLoadingAll && !error && notifications.length === 0 ? (
			<Text className="font-inter text-center text-gray-500 text-sm">
				Você não possui notificações.
			</Text>
		) : null;
	const renderItem = ({ item }: { item: Notification }) => (
		<NotificationCard
			notification={item}
			onOpen={onOpen}
			onMarkAsRead={onMarkAsRead}
			compact={isMobile}
		/>
	);

	return (
		<View
			style={{ width, height: isMobile ? 500 : undefined }}
			className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
		>
			<View className="flex-row items-center border-b border-gray-100 px-4 py-3">
				<Text className="font-inter font-bold text-gray-900 text-base">
					Notificações
				</Text>
			</View>
			{mode === 'flat-list' ? (
				<FlatList
					data={notifications}
					keyExtractor={(item) => item.id}
					renderItem={renderItem}
					style={{ height: 440 }}
					contentContainerStyle={styles.nativeList}
					ListHeaderComponent={status}
					ListEmptyComponent={empty}
					nestedScrollEnabled
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator
				/>
			) : (
				<ScrollView
					style={{ maxHeight: isMobile ? 440 : 480 }}
					contentContainerClassName={isMobile ? 'gap-2 p-3' : 'gap-3 p-4'}
					showsVerticalScrollIndicator={isMobile}
				>
					{status}
					{empty}
					{notifications.map((notification) => (
						<NotificationCard
							key={notification.id}
							notification={notification}
							onOpen={onOpen}
							onMarkAsRead={onMarkAsRead}
							compact={isMobile}
						/>
					))}
				</ScrollView>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	nativeList: { gap: 8, padding: 12 },
	modalRoot: { flex: 1 },
});

export function NotificationCenter({ topOffset }: NotificationCenterProps) {
	const router = useRouter();
	const { width: windowWidth } = useWindowDimensions();
	const isMobile = windowWidth < 768;
	const isNative = Platform.OS !== 'web';
	const [previewOpen, setPreviewOpen] = useState(false);
	const {
		notifications,
		unreadCount,
		isLoading,
		isLoadingAll,
		hasLoadedPreview,
		error,
		loadAll,
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
		await loadAll();
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

	const panel = (
		<NotificationPanel
			windowWidth={windowWidth}
			isMobile={isMobile}
			isNative={isNative}
			notifications={notifications}
			isLoading={isLoading}
			isLoadingAll={isLoadingAll}
			hasLoadedPreview={hasLoadedPreview}
			error={error}
			onOpen={handleOpen}
			onMarkAsRead={handleMarkAsRead}
		/>
	);

	return (
		<View pointerEvents="box-none" className="flex-1">
			{previewOpen && !isNative && (
				<Pressable
					onPress={() => setPreviewOpen(false)}
					accessibilityRole="button"
					accessibilityLabel="Fechar notificações"
					style={{ zIndex: 0 }}
					className="absolute inset-0"
				/>
			)}
			<View
				style={{
					top: isMobile ? topOffset : 28,
					right: isMobile ? 12 : 72,
				}}
				className="absolute z-50"
			>
				<TouchableOpacity
					onPress={() => void togglePreview()}
					accessibilityRole="button"
					accessibilityLabel={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ''}`}
					className="relative h-12 w-12 items-center justify-center"
				>
					<Bell size={isMobile ? 21 : 27} color="#374151" />
					{unreadCount > 0 && (
						<View
							className={`absolute items-center justify-center rounded-full bg-red-600 ${isMobile ? 'left-[1px] top-[5px] h-4 w-4' : 'left-[-1px] top-[3px] h-[18px] w-[18px]'}`}
						>
							<Text
								className={`font-inter font-bold text-white ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}
							>
								{unreadCount > 9 ? '9+' : unreadCount}
							</Text>
						</View>
					)}
				</TouchableOpacity>
				{previewOpen && !isNative && (
					<View className="absolute right-0 top-14 z-50">{panel}</View>
				)}
			</View>

			{previewOpen && isNative && (
				<Modal
					transparent
					visible
					animationType="none"
					onRequestClose={() => setPreviewOpen(false)}
				>
					<View style={styles.modalRoot}>
						<Pressable
							onPress={() => setPreviewOpen(false)}
							accessibilityRole="button"
							accessibilityLabel="Fechar notificações"
							style={StyleSheet.absoluteFill}
						/>
						<View
							style={{
								position: 'absolute',
								top: topOffset + 56,
								right: 12,
							}}
						>
							{panel}
						</View>
					</View>
				</Modal>
			)}
		</View>
	);
}
