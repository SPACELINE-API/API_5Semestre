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
		<View className="min-w-[300px] flex-1 basis-[320px] gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<View className="flex-row items-start justify-between gap-2">
				<View className="min-w-0 flex-1">
					<Text
						className="font-inter font-bold text-gray-900 text-base"
						numberOfLines={2}
					>
						{customer_name}
					</Text>
					<Text className="mt-0.5 font-inter text-gray-400 text-sm">
						{enterprise}
					</Text>
				</View>
				<View className={`rounded-md px-2.5 py-1 ${statusStyle.container}`}>
					<Text className={`font-inter-medium text-xs ${statusStyle.text}`}>
						{statusLabel}
					</Text>
				</View>
			</View>

			<View className="gap-2 border-t border-gray-100 pt-4">
				<View className="flex-row flex-wrap justify-between gap-x-2">
					<Text className="font-inter text-gray-400 text-sm">Documento</Text>
					<Text className="min-w-0 flex-1 text-right font-inter-medium text-gray-800 text-sm">
						{customer_need}
					</Text>
				</View>

				<View className="flex-row flex-wrap justify-between gap-x-2">
					<Text className="font-inter text-gray-400 text-sm">Idioma</Text>
					<Text className="min-w-0 flex-1 text-right font-inter-medium text-gray-800 text-sm">
						{original_language} → {translation_language}
					</Text>
				</View>

				<View className="flex-row flex-wrap justify-between gap-x-2">
					<Text className="font-inter text-gray-400 text-sm">
						Data da solicitação
					</Text>
					<Text className="min-w-0 flex-1 text-right font-inter-medium text-gray-800 text-sm">
						{formatRequestDate(request_date)}
					</Text>
				</View>
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={`${actionLabel} de ${customer_name}`}
				onPress={() => router.push(`/orcamento/gerar/${id}` as never)}
				className={`w-full items-center rounded-lg py-2.5 ${status === 'reproved' ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
			>
				<Text className="font-inter-semibold text-sm text-white">
					{actionLabel}
				</Text>
			</TouchableOpacity>
		</View>
	);
}
