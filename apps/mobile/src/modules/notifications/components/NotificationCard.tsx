import { Check, ChevronRight } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Notification } from '../types/notification';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type NotificationCardProps = {
	notification: Notification;
	onOpen: (notification: Notification) => void;
	onMarkAsRead: (notification: Notification) => void;
	compact?: boolean;
};

function formatNotificationDate(value: string) {
	return new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short',
	}).format(new Date(value));
}

export function NotificationCard({
	notification,
	onOpen,
	onMarkAsRead,
	compact = false,
}: NotificationCardProps) {
	const themeColors = useThemeColors();
	const isRead = Boolean(notification.read_at);

	return (
		<View
			className={`${compact ? 'rounded-md px-2 py-1.5' : 'rounded-lg px-2.5 py-2'} border ${isRead ? 'border-border-subtle bg-surface' : 'border-primary/30 bg-primary-soft/60'}`}
		>
			<TouchableOpacity
				onPress={() => onOpen(notification)}
				accessibilityRole="button"
				accessibilityLabel={`Abrir notificação: ${notification.title}`}
				className="min-w-0 gap-0.5"
			>
				<View className="flex-row items-start gap-2">
					{!isRead && (
						<View className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
					)}
					<Text
						className={`flex-1 font-inter font-semibold text-foreground ${compact ? 'text-xs' : 'text-sm'}`}
					>
						{notification.title}
					</Text>
					<ChevronRight size={15} color={themeColors.foregroundSubtle} />
				</View>
				<Text
					className="font-inter text-foreground-secondary text-xs"
					numberOfLines={compact ? 1 : 2}
				>
					{notification.message}
				</Text>
			</TouchableOpacity>
			<View
				className={`${compact ? 'mt-0.5' : 'mt-1'} flex-row items-center justify-between gap-2`}
			>
				{!isRead ? (
					<TouchableOpacity
						onPress={() => onMarkAsRead(notification)}
						accessibilityRole="button"
						accessibilityLabel={`Marcar como lida: ${notification.title}`}
						className="flex-row items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-primary-soft"
					>
						<Check size={12} color={themeColors.primaryText} />
						<Text className="font-inter font-medium text-primary-text text-[10px]">
							Marcar como lida
						</Text>
					</TouchableOpacity>
				) : (
					<View />
				)}
				<Text className="ml-auto text-right font-inter text-foreground-subtle text-[10px]">
					{formatNotificationDate(notification.created_at)}
				</Text>
			</View>
		</View>
	);
}
