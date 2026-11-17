import { Text, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function RejectedRequestNotice({
	reprovedBy,
	reason,
}: {
	reprovedBy?: string | null;
	reason?: string | null;
}) {
	const themeColors = useThemeColors();
	return (
		<View className="mt-2 flex-row items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
			<CircleAlert size={19} color={themeColors.danger} />
			<View className="flex-1">
				<Text className="font-inter-semibold text-sm text-danger-text">
					Solicitação reprovada
				</Text>
				<Text className="mt-1 font-inter text-sm text-danger-text">
					Reprovado por: {reprovedBy || 'Responsável não identificado'}
				</Text>
				{reason ? (
					<Text className="mt-1 font-inter text-sm text-danger-text">
						Motivo: {reason}
					</Text>
				) : null}
				<Text className="mt-1 font-inter text-sm text-danger-text">
					Esta solicitação não pode gerar um orçamento.
				</Text>
			</View>
		</View>
	);
}
