import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { CircleAlert, X } from 'lucide-react-native';
import { DateField } from '../../../shared/components/DateField';
import {
	dateInputToIso,
	formatDateOnly,
	isoToDateInput,
	todayInputValue,
} from '../../../shared/utils/dateOnly';
import { useThemeColors } from '../../../shared/theme/ThemeProvider';
import { setServiceOrderItemDeadline } from '../services/serviceOrderService';
import type { ServiceOrderItem } from '../types/serviceOrder';

type ItemDeadlineModalProps = {
	item: ServiceOrderItem | null;
	projectDeadline: string | null;
	onClose: () => void;
	onSaved: (item: ServiceOrderItem) => void;
};

export function ItemDeadlineModal({
	item,
	projectDeadline,
	onClose,
	onSaved,
}: ItemDeadlineModalProps) {
	const themeColors = useThemeColors();
	const [deadline, setDeadline] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');
	const maxDate = projectDeadline ? isoToDateInput(projectDeadline) : undefined;

	useEffect(() => {
		setDeadline(isoToDateInput(item?.deadline));
		setError('');
	}, [item]);

	if (!item) return null;

	async function save() {
		if (!item) return;
		const iso = dateInputToIso(deadline);
		if (!iso) {
			setError('Selecione o prazo do documento.');
			return;
		}
		setIsSaving(true);
		setError('');
		try {
			onSaved(await setServiceOrderItemDeadline(item.id, iso));
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível salvar o prazo. Tente novamente.',
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Modal visible transparent animationType="none" onRequestClose={onClose}>
			<View className="flex-1 items-center justify-center bg-overlay/40 px-4">
				<View className="w-full max-w-[420px] rounded-xl bg-surface">
					<View className="flex-row items-center justify-between border-b border-border-strong px-6 py-4">
						<Text className="font-inter font-bold text-foreground text-lg">
							Prazo do documento
						</Text>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Fechar"
							onPress={onClose}
						>
							<X size={20} color={themeColors.foregroundSecondary} />
						</TouchableOpacity>
					</View>

					<View className="gap-4 px-6 py-5">
						<Text className="font-inter text-foreground-secondary text-sm">
							{item.source_language} → {item.target_language}
							{item.document_type ? ` · ${item.document_type}` : ''}
						</Text>

						<View style={{ zIndex: 10 }}>
							<DateField
								label="Prazo de entrega do documento"
								value={deadline}
								minDate={todayInputValue()}
								maxDate={maxDate}
								onChangeText={(value) => {
									setDeadline(value);
									setError('');
								}}
							/>
						</View>

						{projectDeadline ? (
							<Text className="font-inter text-foreground-muted text-xs">
								Prazo final do projeto: {formatDateOnly(projectDeadline)}. O
								prazo do documento não pode passar dessa data.
							</Text>
						) : null}

						{error ? (
							<View className="flex-row items-start gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3">
								<CircleAlert size={16} color={themeColors.danger} />
								<Text className="flex-1 font-inter text-danger-text text-sm">
									{error}
								</Text>
							</View>
						) : null}
					</View>

					<View className="flex-row justify-end gap-3 border-t border-border-strong px-6 py-4">
						<TouchableOpacity
							accessibilityRole="button"
							onPress={onClose}
							className="rounded-lg border border-border-strong px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-foreground text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							disabled={isSaving}
							onPress={() => void save()}
							className={`min-w-[96px] items-center rounded-lg px-5 py-2.5 ${isSaving ? 'bg-border-strong opacity-60' : 'bg-primary'}`}
						>
							{isSaving ? (
								<ActivityIndicator
									size="small"
									color={themeColors.primaryForeground}
								/>
							) : (
								<Text className="font-inter font-semibold text-primary-foreground text-sm">
									Salvar
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
