import { Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

import type { QuoteFromRequestResponse } from '../services/quotesService';

function formatDate(value?: string) {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			});
}

export function GeneratedQuoteNotice({
	quote,
	onViewQuotes,
}: {
	quote: QuoteFromRequestResponse;
	onViewQuotes: () => void;
}) {
	return (
		<View className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6">
			<View className="flex-row items-start gap-3">
				<CheckCircle2 size={22} color="#16a34a" />
				<View className="flex-1">
					<Text className="font-inter-bold text-base text-green-900">
						Orçamento criado a partir da requisição.
					</Text>
					<Text className="font-inter text-sm text-green-800 mt-1">
						Código do orçamento: #{quote.id.slice(0, 8).toUpperCase()}
					</Text>
					<Text className="font-inter text-xs text-green-800 mt-1">
						Status: Pendente
					</Text>
					<Text className="font-inter text-xs text-green-800 mt-1">
						Criado em: {formatDate(quote.created_at)}
					</Text>
				</View>
			</View>
			<TouchableOpacity
				accessibilityRole="button"
				onPress={onViewQuotes}
				className="self-start mt-4 rounded-lg bg-green-700 px-4 py-2.5"
			>
				<Text className="font-inter-medium text-sm text-white">
					Ver orçamentos
				</Text>
			</TouchableOpacity>
		</View>
	);
}
