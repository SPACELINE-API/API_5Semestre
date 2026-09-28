import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

export interface CardRequestProps {
	id: number | string;
	customer_name: string;
	enterprise: string;
	original_language: string;
	translation_language: string;
	customer_need: string;
	status: string;
	request_date: string;
}

function formatRequestDate(request_date: string): string {
	const date = new Date(request_date);

	if (Number.isNaN(date.getTime())) {
		return request_date;
	}

	const formatted = date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: 'long',
		year: 'numeric',
	});

	return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function CardRequest({
	id,
	customer_name,
	enterprise,
	original_language,
	translation_language,
	customer_need,
	status,
	request_date,
}: CardRequestProps) {
	const router = useRouter();
	const statusLabel =
		status === 'approved'
			? 'Aprovada'
			: status === 'reproved'
				? 'Reprovada'
				: 'Pendente';
	const statusStyle =
		status === 'approved'
			? { container: 'bg-green-50', text: 'text-green-800' }
			: status === 'reproved'
				? { container: 'bg-red-50', text: 'text-red-800' }
				: { container: 'bg-orange-100', text: 'text-orange-800' };
	const actionLabel =
		status === 'approved'
			? 'Revisar e gerar orçamento'
			: status === 'reproved'
				? 'Ver decisão da solicitação'
				: 'Revisar solicitação';

	return (
		<View className="w-full max-w-80 min-w-0 rounded-lg border border-gray-200 bg-white p-4">
			<View className="flex-row items-start justify-between gap-2 mb-3">
				<View className="min-w-0 flex-1">
					<Text className="font-bold text-gray-900 text-sm" numberOfLines={2}>
						{customer_name}
					</Text>
					<Text className="text-gray-400 text-xs mt-0.5">{enterprise}</Text>
				</View>
				<View className={`rounded-md px-2 py-1 ${statusStyle.container}`}>
					<Text className={`text-[10px] font-inter-medium ${statusStyle.text}`}>
						{statusLabel}
					</Text>
				</View>
			</View>

			<View className="mb-1 flex-row flex-wrap justify-between gap-x-2">
				<Text className="text-gray-400 text-xs">Documento</Text>
				<Text className="min-w-0 flex-1 text-right text-xs text-gray-800">
					{customer_need}
				</Text>
			</View>

			<View className="mb-1 flex-row flex-wrap justify-between gap-x-2">
				<Text className="text-gray-400 text-xs">Idioma</Text>
				<Text className="min-w-0 flex-1 text-right text-xs text-gray-800">
					{original_language} → {translation_language}
				</Text>
			</View>

			<View className="mb-1 flex-row flex-wrap justify-between gap-x-2">
				<Text className="text-gray-400 text-xs">Data da solicitação</Text>
				<Text className="min-w-0 flex-1 text-right text-xs text-gray-800">
					{formatRequestDate(request_date)}
				</Text>
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={`${actionLabel} de ${customer_name}`}
				onPress={() => router.push(`/orcamento/gerar/${id}` as never)}
				className={`mt-4 w-full items-center rounded-md py-2 hover:bg-blue-500 ${status === 'reproved' ? 'bg-gray-500' : 'bg-blue-500'}`}
			>
				<Text className="text-white text-xs font-medium">{actionLabel}</Text>
			</TouchableOpacity>
		</View>
	);
}
