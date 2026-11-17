import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import type { DashboardMetric } from '../types/shortcut';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type AttentionBannerProps = {
	metrics: DashboardMetric[];
};

/** Só renderiza quando há pendência. Em dia = nada na tela. */
export function AttentionBanner({ metrics }: AttentionBannerProps) {
	const themeColors = useThemeColors();
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
					className="flex-row items-center gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3 transition-colors hover:bg-warning-soft/70 active:bg-warning-soft"
				>
					<AlertCircle size={18} color={themeColors.warningText} />
					<Text
						className="flex-1 font-inter-medium text-sm text-warning-text"
						numberOfLines={2}
					>
						{metric.description}
					</Text>
					{metric.route && (
						<ChevronRight size={16} color={themeColors.warningText} />
					)}
				</Pressable>
			))}
		</View>
	);
}
