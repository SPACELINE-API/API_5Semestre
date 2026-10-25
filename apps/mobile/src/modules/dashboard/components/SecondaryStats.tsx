import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import type { DashboardMetric } from '../types/shortcut';

type SecondaryStatsProps = {
	metrics: DashboardMetric[];
};
export function SecondaryStats({ metrics }: SecondaryStatsProps) {
	const router = useRouter();
	if (metrics.length === 0) return null;

	return (
		<View className="flex-row flex-wrap gap-2 md:gap-3">
			{metrics.map((metric) => (
				<Pressable
					key={metric.id}
					accessibilityRole="button"
					accessibilityLabel={`${metric.title}: ${metric.value}`}
					disabled={!metric.route}
					onPress={() => metric.route && router.push(metric.route as never)}
					className="min-w-[140px] flex-1 flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 py-3 transition-colors hover:bg-gray-50 active:bg-gray-100 md:max-w-[320px]"
				>
					<Text
						className="mr-2 flex-1 font-inter text-sm text-gray-600"
						numberOfLines={1}
					>
						{metric.title}
					</Text>
					<View className="flex-row items-center gap-1">
						<Text className="font-inter-semibold text-sm text-gray-900">
							{metric.value}
						</Text>
						{metric.route && <ChevronRight size={14} color="#9ca3af" />}
					</View>
				</Pressable>
			))}
		</View>
	);
}
