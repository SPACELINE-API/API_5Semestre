import { Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

export function RejectedRequestNotice({
	reprovedBy,
	reason,
}: {
	reprovedBy?: string | null;
	reason?: string | null;
}) {
	return (
		<View className="mt-2 flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
			<CircleAlert size={19} color="#dc2626" />
			<View className="flex-1">
				<Text className="font-inter-semibold text-sm text-red-900">
					Solicitação reprovada
				</Text>
				<Text className="mt-1 font-inter text-sm text-red-800">
					Reprovado por: {reprovedBy || 'Responsável não identificado'}
				</Text>
				{reason ? (
					<Text className="mt-1 font-inter text-sm text-red-800">
						Motivo: {reason}
					</Text>
				) : null}
				<Text className="mt-1 font-inter text-sm text-red-800">
					Esta solicitação não pode gerar um orçamento.
				</Text>
			</View>
		</View>
	);
}
