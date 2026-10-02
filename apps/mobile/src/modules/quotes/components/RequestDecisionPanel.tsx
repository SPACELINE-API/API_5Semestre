import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

type RequestDecisionPanelProps = {
	error: string;
	rejectionFormOpen: boolean;
	reprovalReason: string;
	statusUpdating: boolean;
	onReasonChange: (value: string) => void;
	onOpenRejection: () => void;
	onCancelRejection: () => void;
	onApprove: () => void;
	onReprove: () => void;
};

export function RequestDecisionPanel({
	error,
	rejectionFormOpen,
	reprovalReason,
	statusUpdating,
	onReasonChange,
	onOpenRejection,
	onCancelRejection,
	onApprove,
	onReprove,
}: RequestDecisionPanelProps) {
	return (
		<View className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
			<Text className="font-inter-bold text-sm text-gray-900">
				Decisão da solicitação
			</Text>
			<Text className="mt-1 font-inter text-sm text-gray-500">
				Aprove para liberar a geração do orçamento ou informe o motivo da
				reprovação.
			</Text>
			{error ? (
				<View className="mt-4 flex-row items-start gap-2 rounded-lg bg-red-50 p-3">
					<CircleAlert size={18} color="#dc2626" />
					<Text className="flex-1 font-inter text-sm text-red-800">
						{error}
					</Text>
				</View>
			) : null}

			{rejectionFormOpen ? (
				<View className="mt-4 gap-2">
					<Text className="font-inter-medium text-sm text-gray-800">
						Motivo da reprovação
					</Text>
					<TextInput
						value={reprovalReason}
						onChangeText={onReasonChange}
						maxLength={500}
						multiline
						textAlignVertical="top"
						placeholder="Explique por que a solicitação foi reprovada"
						className="min-h-24 rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
					/>
					<Text className="text-right font-inter text-xs text-gray-400">
						{reprovalReason.length}/500
					</Text>
					<View className="flex-row flex-wrap gap-3">
						<TouchableOpacity
							accessibilityRole="button"
							disabled={statusUpdating}
							onPress={onReprove}
							className={`rounded-lg px-4 py-2.5 ${statusUpdating ? 'bg-gray-300' : 'bg-red-600'}`}
						>
							<Text className="font-inter-medium text-sm text-white">
								{statusUpdating ? 'Salvando...' : 'Confirmar reprovação'}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							disabled={statusUpdating}
							onPress={onCancelRejection}
							className="rounded-lg border border-gray-300 px-4 py-2.5"
						>
							<Text className="font-inter-medium text-sm text-gray-700">
								Cancelar
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View className="mt-5 flex-row flex-wrap gap-3">
					<TouchableOpacity
						accessibilityRole="button"
						disabled={statusUpdating}
						onPress={onOpenRejection}
						className="rounded-lg border border-red-200 px-4 py-3"
					>
						<Text className="font-inter-medium text-sm text-red-700">
							Reprovar solicitação
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						accessibilityRole="button"
						disabled={statusUpdating}
						onPress={onApprove}
						className={`rounded-lg px-4 py-3 ${statusUpdating ? 'bg-gray-300' : 'bg-blue-600'}`}
					>
						<Text className="font-inter-medium text-sm text-white">
							{statusUpdating ? 'Salvando...' : 'Aprovar solicitação'}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}
