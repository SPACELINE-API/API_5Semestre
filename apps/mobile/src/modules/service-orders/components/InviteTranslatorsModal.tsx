import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import type { Translator } from '../types/serviceOrder';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type InviteTranslatorsModalProps = {
	visible: boolean;
	translators: Translator[];
	onClose: () => void;
	onSubmit: (translatorIds: string[]) => Promise<void>;
	toast?: ToastData | null;
};

function Checkbox({
	checked,
	onPress,
	accessibilityLabel,
}: {
	checked: boolean;
	onPress: () => void;
	accessibilityLabel: string;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			accessibilityLabel={accessibilityLabel}
			className={`h-[18px] w-[18px] items-center justify-center rounded border ${
				checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
			}`}
		>
			{checked && <Check size={12} color="#FFFFFF" />}
		</TouchableOpacity>
	);
}

export function InviteTranslatorsModal({
	visible,
	translators,
	onClose,
	onSubmit,
	toast,
}: InviteTranslatorsModalProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	function toggleSelect(id: string) {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function handleClose() {
		setSelectedIds(new Set());
		setError(null);
		onClose();
	}

	async function handleSubmit() {
		setError(null);

		if (selectedIds.size === 0) {
			setError('Selecione ao menos um tradutor.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit(Array.from(selectedIds));
			handleClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível enviar os convites.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[480px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<Text className="font-inter font-bold text-gray-900 text-lg">
							Convidar tradutores
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView className="px-6 py-4" contentContainerClassName="gap-3">
						{translators.map((translator) => {
							const isSelected = selectedIds.has(translator.id);

							return (
								<TouchableOpacity
									key={translator.id}
									onPress={() => toggleSelect(translator.id)}
									activeOpacity={0.7}
									className="flex-row items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
								>
									<Checkbox
										checked={isSelected}
										onPress={() => toggleSelect(translator.id)}
										accessibilityLabel={`Selecionar tradutor ${translator.name}`}
									/>

									<View className="flex-1">
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{translator.name}
										</Text>
										<Text className="font-inter text-gray-400 text-xs">
											{translator.email}
										</Text>
									</View>
								</TouchableOpacity>
							);
						})}

						{translators.length === 0 && (
							<Text className="font-inter text-gray-400 text-sm">
								Nenhum tradutor cadastrado.
							</Text>
						)}

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</ScrollView>

					<View className="flex-row items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							className={`rounded-lg bg-blue-300 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-blue-900 text-sm">
								{isSubmitting ? 'Enviando…' : 'Enviar convites'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{toast && (
					<View pointerEvents="none" className="absolute bottom-6 left-6">
						<ToastMessage toast={toast} />
					</View>
				)}
			</View>
		</Modal>
	);
}
