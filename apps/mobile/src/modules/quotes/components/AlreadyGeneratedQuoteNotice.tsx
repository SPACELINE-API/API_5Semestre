import { Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ExternalLink } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type AlreadyGeneratedQuoteNoticeProps = {
	quoteId: string;
	onViewQuotes: () => void;
};

export function AlreadyGeneratedQuoteNotice({
	quoteId,
	onViewQuotes,
}: AlreadyGeneratedQuoteNoticeProps) {
	const themeColors = useThemeColors();
	const shortQuoteId = quoteId.slice(0, 8).toUpperCase();

	return (
		<View className="mb-6 rounded-xl border border-success/30 bg-success-soft p-5">
			<View className="flex-row items-start gap-3">
				<View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-success-soft">
					<CheckCircle2 size={20} color={themeColors.success} />
				</View>
				<View className="flex-1 gap-2">
					<Text className="font-inter-semibold text-sm text-success-text">
						O orçamento desta requisição já foi gerado.
					</Text>
					<Text className="font-inter text-sm text-success-text">
						Código do orçamento: #{shortQuoteId}
					</Text>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={onViewQuotes}
						className="mt-2 min-h-[44px] w-full items-center justify-center rounded-lg border border-success/40 bg-success-soft px-4"
					>
						<View className="flex-row items-center gap-2">
							<ExternalLink size={16} color={themeColors.successText} />
							<Text className="font-inter-medium text-sm text-success-text">
								Ver orçamentos
							</Text>
						</View>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}
