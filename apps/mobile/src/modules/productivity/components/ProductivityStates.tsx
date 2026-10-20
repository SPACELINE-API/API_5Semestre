import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, BarChart3 } from 'lucide-react-native';

export function ProductivityLoading() {
	return (
		<View className="items-center justify-center py-16">
			<ActivityIndicator color="#6B7280" />
			<Text className="mt-3 font-inter text-gray-400 text-sm">
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
	return (
		<View className="items-start gap-3 py-8">
			<View className="flex-row items-center gap-2">
				<AlertCircle size={16} color="#DC2626" />
				<Text className="font-inter font-semibold text-red-600 text-sm">
					Não foi possível exibir o relatório
				</Text>
			</View>
			<Text className="font-inter text-gray-500 text-sm">{message}</Text>
			<TouchableOpacity
				onPress={onRetry}
				activeOpacity={0.7}
				accessibilityRole="button"
				className="rounded-lg border border-gray-300 px-4 py-2"
			>
				<Text className="font-inter text-gray-700 text-sm">
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
	return (
		<View className="items-center justify-center py-16">
			<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
				<BarChart3 size={18} color="#9CA3AF" />
			</View>
			<Text className="font-inter font-medium text-gray-800 text-sm">
				{title}
			</Text>
			<Text className="mt-1 text-center font-inter text-gray-400 text-xs">
				{description}
			</Text>
		</View>
	);
}
