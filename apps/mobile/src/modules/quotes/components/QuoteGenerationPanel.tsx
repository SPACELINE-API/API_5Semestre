import { Text, TouchableOpacity, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

type MissingField = { key: string; label: string };

type QuoteGenerationPanelProps = {
	missingFields: MissingField[];
	error: string;
	canGenerate: boolean;
	generating: boolean;
	onGenerate: () => void;
};

export function QuoteGenerationPanel({
	missingFields,
	error,
	canGenerate,
	generating,
	onGenerate,
}: QuoteGenerationPanelProps) {
	return (
		<>
			{missingFields.length > 0 && (
				<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
					<CircleAlert size={19} color="#dc2626" />
					<View className="flex-1">
						<Text className="font-inter-bold text-sm text-red-900">
							Dados obrigatórios ausentes
						</Text>
						<Text className="mt-1 font-inter text-sm text-red-800">
							Preencha na requisição:{' '}
							{missingFields.map((field) => field.label).join(', ')}.
						</Text>
					</View>
				</View>
			)}
			{error ? (
				<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
					<CircleAlert size={19} color="#dc2626" />
					<Text className="flex-1 font-inter text-sm text-red-800">{error}</Text>
				</View>
			) : null}

			<View className="flex-col items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:p-6">
				<View className="flex-1">
					<Text className="font-inter-bold text-sm text-gray-900">
						Revisão do orçamento
					</Text>
					<Text className="mt-1 font-inter text-sm text-gray-500">
						Os dados aprovados serão usados para criar o orçamento. Itens e
						documentos poderão ser incluídos depois.
					</Text>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityState={{ disabled: !canGenerate || generating }}
					disabled={!canGenerate || generating}
					onPress={onGenerate}
					className={`w-full items-center rounded-lg px-6 py-3 md:w-auto ${canGenerate && !generating ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}`}
				>
					<Text className="font-inter-medium text-sm text-white">
						{generating ? 'Gerando orçamento...' : 'Confirmar geração'}
					</Text>
				</TouchableOpacity>
			</View>
		</>
	);
}
