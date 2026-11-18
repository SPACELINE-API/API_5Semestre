import { useEffect, useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RotateCcw } from 'lucide-react-native';

export function ReopenQuoteDialog({
	visible,
	quoteLabel,
	onConfirm,
	onCancel,
}: {
	visible: boolean;
	quoteLabel: string;
	onConfirm: (reason: string) => Promise<string | null>;
	onCancel: () => void;
}) {
	const [reason, setReason] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if (!visible) return;
		setReason('');
		setError('');
		setSubmitting(false);
	}, [visible]);

	if (!visible) return null;

	async function handleConfirm() {
		const trimmed = reason.trim();
		if (!trimmed) {
			setError('Informe o motivo da reabertura.');
			return;
		}
		setSubmitting(true);
		setError('');
		const message = await onConfirm(trimmed);
		setSubmitting(false);
		if (message) setError(message);
	}

	return (
		<Modal visible transparent animationType="none" onRequestClose={onCancel}>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View
					accessibilityRole="none"
					accessibilityLabel="Reabrir orçamento"
					className="w-full max-w-[440px] gap-4 rounded-xl bg-white p-6"
				>
					<View className="flex-row items-center gap-3">
						<View className="h-11 w-11 items-center justify-center rounded-full bg-amber-50">
							<RotateCcw size={20} color="#b45309" />
						</View>
						<View className="flex-1">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								Reabrir orçamento #{quoteLabel}
							</Text>
							<Text className="font-inter text-sm text-gray-600">
								O orçamento volta para Em preparação e pode ser alterado. A
								ordem de serviço existente não é alterada.
							</Text>
						</View>
					</View>

					<View className="gap-1">
						<Text className="font-inter-medium text-xs text-gray-500">
							Motivo da reabertura
						</Text>
						<TextInput
							accessibilityLabel="Motivo da reabertura"
							value={reason}
							onChangeText={(value) => {
								setReason(value);
								setError('');
							}}
							maxLength={500}
							multiline
							textAlignVertical="top"
							placeholder="Ex.: o cliente enviou um novo documento"
							className="min-h-24 rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
						/>
					</View>

					{error ? (
						<Text className="font-inter text-sm text-red-700">{error}</Text>
					) : null}

					<View className="flex-row flex-wrap justify-end gap-3">
						<TouchableOpacity
							accessibilityRole="button"
							disabled={submitting}
							onPress={onCancel}
							className="rounded-lg border border-gray-300 px-4 py-2.5"
						>
							<Text className="font-inter-medium text-sm text-gray-700">
								Cancelar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							accessibilityRole="button"
							disabled={submitting}
							onPress={() => void handleConfirm()}
							className={`rounded-lg px-4 py-2.5 ${submitting ? 'bg-gray-300' : 'bg-amber-600'}`}
						>
							<Text className="font-inter-medium text-sm text-white">
								{submitting ? 'Reabrindo...' : 'Confirmar reabertura'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
