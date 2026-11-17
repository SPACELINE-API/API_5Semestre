import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CircleAlert } from 'lucide-react-native';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
	const themeColors = useThemeColors();
	const canWriteRequests = usePermission('requests.write');

	return (
		<View className="rounded-lg border border-border bg-surface p-4 md:p-6">
			<Text className="font-inter-bold text-sm text-foreground">
				Decisão da solicitação
			</Text>
			<Text className="mt-1 font-inter text-sm text-foreground-muted">
				Aprove para liberar a geração do orçamento ou informe o motivo da
				reprovação.
			</Text>
			{error ? (
				<View className="mt-4 flex-row items-start gap-2 rounded-lg bg-danger-soft p-3">
					<CircleAlert size={18} color={themeColors.danger} />
					<Text className="flex-1 font-inter text-sm text-danger-text">
						{error}
					</Text>
				</View>
			) : null}

			{rejectionFormOpen ? (
				<View className="mt-4 gap-2">
					<Text className="font-inter-medium text-sm text-foreground">
						Motivo da reprovação
					</Text>
					<TextInput
						value={reprovalReason}
						onChangeText={onReasonChange}
						maxLength={500}
						multiline
						textAlignVertical="top"
						placeholder="Explique por que a solicitação foi reprovada"
						className="min-h-24 rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
					/>
					<Text className="text-right font-inter text-xs text-foreground-subtle">
						{reprovalReason.length}/500
					</Text>
					<View className="flex-row flex-wrap gap-3">
						<TouchableOpacity
							accessibilityRole="button"
							disabled={statusUpdating}
							onPress={onReprove}
							className={`rounded-lg px-4 py-2.5 ${statusUpdating ? 'bg-border-strong' : 'bg-danger'}`}
						>
							<Text className="font-inter-medium text-sm text-primary-foreground">
								{statusUpdating ? 'Salvando...' : 'Confirmar reprovação'}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							disabled={statusUpdating}
							onPress={onCancelRejection}
							className="rounded-lg border border-border-strong px-4 py-2.5"
						>
							<Text className="font-inter-medium text-sm text-foreground-secondary">
								Cancelar
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View className="mt-5 flex-row flex-wrap gap-3">
					<TouchableOpacity
						accessibilityRole="button"
						disabled={statusUpdating || !canWriteRequests}
						onPress={onOpenRejection}
						className={`rounded-lg border border-danger/30 px-4 py-3 ${!canWriteRequests ? 'opacity-40' : ''}`}
					>
						<Text className="font-inter-medium text-sm text-danger">
							Reprovar solicitação
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						accessibilityRole="button"
						disabled={statusUpdating || !canWriteRequests}
						onPress={onApprove}
						className={`rounded-lg px-4 py-3 ${statusUpdating ? 'bg-border-strong' : 'bg-primary'} ${!canWriteRequests ? 'opacity-40' : ''}`}
					>
						<Text className="font-inter-medium text-sm text-primary-foreground">
							{statusUpdating ? 'Salvando...' : 'Aprovar solicitação'}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}
