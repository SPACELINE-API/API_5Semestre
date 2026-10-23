import { Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ExternalLink } from 'lucide-react-native';

type AlreadyGeneratedQuoteNoticeProps = {
	quoteId: string;
	onViewQuotes: () => void;
};

export function AlreadyGeneratedQuoteNotice({
	quoteId,
	onViewQuotes,
}: AlreadyGeneratedQuoteNoticeProps) {
	const shortQuoteId = quoteId.slice(0, 8).toUpperCase();

	return (
		<View className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5">
			<View className="flex-row items-start gap-3">
				<View className="mt-0.5 h-10 w-10 items-center justify-center rounded-full bg-green-100">
					<CheckCircle2 size={20} color="#16a34a" />
				</View>
				<View className="flex-1 gap-2">
					<Text className="font-inter-semibold text-sm text-green-900">
						O orçamento desta requisição já foi gerado.
					</Text>
					<Text className="font-inter text-sm text-green-800">
						Código do orçamento: #{shortQuoteId}
					</Text>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={onViewQuotes}
						className="mt-2 min-h-[44px] w-full items-center justify-center rounded-lg border border-green-300 bg-green-100 px-4"
					>
						<View className="flex-row items-center gap-2">
							<ExternalLink size={16} color="#15803d" />
							<Text className="font-inter-medium text-sm text-green-700">
								Ver orçamentos
							</Text>
						</View>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}
