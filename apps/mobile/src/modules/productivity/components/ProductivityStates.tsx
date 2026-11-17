import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, BarChart3 } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function ProductivityLoading() {
	const themeColors = useThemeColors();
	return (
		<View className="items-center justify-center py-16">
			<ActivityIndicator color={themeColors.foregroundMuted} />
			<Text className="mt-3 font-inter text-foreground-subtle text-sm">
				Carregando relatório...
			</Text>
		</View>
	);
}

type ProductivityErrorProps = { message: string; onRetry: () => void };

export function ProductivityError({
	message,
	onRetry,
}: ProductivityErrorProps) {
	const themeColors = useThemeColors();
	return (
		<View className="items-start gap-3 py-8">
			<View className="flex-row items-center gap-2">
				<AlertCircle size={16} color={themeColors.danger} />
				<Text className="font-inter font-semibold text-danger text-sm">
					Não foi possível exibir o relatório
				</Text>
			</View>
			<Text className="font-inter text-foreground-muted text-sm">
				{message}
			</Text>
			<TouchableOpacity
				onPress={onRetry}
				activeOpacity={0.7}
				accessibilityRole="button"
				className="rounded-lg border border-border-strong px-4 py-2"
			>
				<Text className="font-inter text-foreground-secondary text-sm">
					Tentar novamente
				</Text>
			</TouchableOpacity>
		</View>
	);
}

type ProductivityEmptyProps = { title: string; description: string };

export function ProductivityEmpty({
	title,
	description,
}: ProductivityEmptyProps) {
	const themeColors = useThemeColors();
	return (
		<View className="items-center justify-center py-16">
			<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
				<BarChart3 size={18} color={themeColors.foregroundSubtle} />
			</View>
			<Text className="font-inter font-medium text-foreground text-sm">
				{title}
			</Text>
			<Text className="mt-1 text-center font-inter text-foreground-subtle text-xs">
				{description}
			</Text>
		</View>
	);
}
