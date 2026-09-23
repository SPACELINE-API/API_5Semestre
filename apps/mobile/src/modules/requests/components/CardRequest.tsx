import { Text, TouchableOpacity, View } from 'react-native';

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
	customer_name,
	enterprise,
	original_language,
	translation_language,
	customer_need,
	request_date,
}: CardRequestProps) {
	return (
		<View className="w-80 bg-white border border-gray-200 rounded-lg p-4">
			<Text className="font-bold text-gray-900 text-sm">{customer_name}</Text>
			<Text className="text-gray-400 text-xs mb-3">{enterprise}</Text>

			<View className="flex-row justify-between mb-1">
				<Text className="text-gray-400 text-xs">Documento</Text>
				<Text className="text-gray-800 text-xs">{customer_need}</Text>
			</View>

			<View className="flex-row justify-between mb-1">
				<Text className="text-gray-400 text-xs">Idioma</Text>
				<Text className="text-gray-800 text-xs">
					{original_language} → {translation_language}
				</Text>
			</View>

			<View className="flex-row justify-between mb-1">
				<Text className="text-gray-400 text-xs">Data da solicitação</Text>
				<Text className="text-gray-800 text-xs">
					{formatRequestDate(request_date)}
				</Text>
			</View>

			<TouchableOpacity className="bg-blue-400 rounded-md py-2 items-center hover:bg-blue-500 mt-4">
				<Text className="text-white text-xs font-medium">
					Transformar em orçamento
				</Text>
			</TouchableOpacity>
		</View>
	);
}
