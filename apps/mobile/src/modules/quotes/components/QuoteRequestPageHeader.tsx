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
			? { container: 'bg-success-soft', text: 'text-success-text' }
			: status === 'reproved'
				? { container: 'bg-danger-soft', text: 'text-danger-text' }
				: { container: 'bg-warning-soft', text: 'text-warning-text' };

	return (
		<>
			<TouchableOpacity
				accessibilityRole="button"
				onPress={onBack}
				className="flex-row items-center self-start gap-2 mb-6 rounded-lg px-2 py-2 hover:bg-surface-muted"
			>
				<ArrowLeft size={17} color="#4b5563" />
				<Text className="font-inter-medium text-sm text-foreground-secondary">
					Voltar para requisições
				</Text>
			</TouchableOpacity>
			<View className="flex-row flex-wrap items-start justify-between gap-4 mb-6">
				<View className="flex-1 min-w-[220px]">
					<Text className="font-poppins-bold text-2xl text-foreground">
						Gerar orçamento
					</Text>
					<Text className="font-inter text-sm text-foreground-muted mt-1">
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
