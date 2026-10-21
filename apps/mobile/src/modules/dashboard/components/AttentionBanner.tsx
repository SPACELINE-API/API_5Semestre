import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import type { DashboardMetric } from '../types/shortcut';

type AttentionBannerProps = {
	metrics: DashboardMetric[];
};

/** Só renderiza quando há pendência. Em dia = nada na tela. */
export function AttentionBanner({ metrics }: AttentionBannerProps) {
	const router = useRouter();
	if (metrics.length === 0) return null;

	return (
		<View className="gap-2">
			{metrics.map((metric) => (
				<Pressable
					key={metric.id}
					accessibilityRole="button"
					accessibilityLabel={metric.description}
					disabled={!metric.route}
					onPress={() => metric.route && router.push(metric.route as never)}
					className="flex-row items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 transition-colors hover:bg-amber-100/70 active:bg-amber-100"
				>
					<AlertCircle size={18} color="#b45309" />
					<Text
						className="flex-1 font-inter-medium text-sm text-amber-900"
						numberOfLines={2}
					>
						{metric.description}
					</Text>
					{metric.route && <ChevronRight size={16} color="#b45309" />}
				</Pressable>
			))}
		</View>
	);
}
