import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

export function QuoteRequestPageHeader({
	status,
	onBack,
}: {
	status?: string;
	onBack: () => void;
}) {
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

	return (
		<>
			<TouchableOpacity
				accessibilityRole="button"
				onPress={onBack}
				className="flex-row items-center self-start gap-2 mb-6 rounded-lg px-2 py-2 hover:bg-gray-100"
			>
				<ArrowLeft size={17} color="#4b5563" />
				<Text className="font-inter-medium text-sm text-gray-600">
					Voltar para requisições
				</Text>
			</TouchableOpacity>
			<View className="flex-row flex-wrap items-start justify-between gap-4 mb-6">
				<View className="flex-1 min-w-[220px]">
					<Text className="font-poppins-bold text-2xl text-gray-900">
						Gerar orçamento
					</Text>
					<Text className="font-inter text-sm text-gray-500 mt-1">
						Revise os dados da requisição antes de confirmar a geração.
					</Text>
				</View>
				{status != null && (
					<View className={`rounded-md px-3 py-1.5 ${statusStyle.container}`}>
						<Text className={`font-inter-medium text-xs ${statusStyle.text}`}>
							{statusLabel}
						</Text>
					</View>
				)}
			</View>
		</>
	);
}
