import { useMemo, useState } from 'react';
import {
	Modal,
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { X, Check, Search, Users } from 'lucide-react-native';
import type { Translator } from '../types/serviceOrder';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type InviteTranslatorsModalProps = {
	visible: boolean;
	translators: Translator[];
	pendingTranslatorIds?: Set<string>;
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
	pendingTranslatorIds = new Set(),
	onClose,
	onSubmit,
	toast,
}: InviteTranslatorsModalProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [search, setSearch] = useState('');
	const [isConfirmingAll, setIsConfirmingAll] = useState(false);

	const filteredTranslators = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return translators;
		return translators.filter(
			(translator) =>
				translator.name.toLowerCase().includes(query) ||
				translator.email.toLowerCase().includes(query),
		);
	}, [translators, search]);

	const eligibleTranslators = useMemo(
		() =>
			translators.filter(
				(translator) =>
					translator.is_active && !pendingTranslatorIds.has(translator.id),
			),
		[translators, pendingTranslatorIds],
	);

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
		setSearch('');
		setIsConfirmingAll(false);
		onClose();
	}

	async function handleSubmit(ids: string[] = Array.from(selectedIds)) {
		setError(null);

		if (ids.length === 0) {
			setError('Selecione ao menos um tradutor.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit(ids);
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

					<View className="flex-row items-center gap-2 border-b border-gray-100 px-6 py-3">
						<Search size={16} color="#9CA3AF" />
						<TextInput
							value={search}
							onChangeText={setSearch}
							placeholder="Buscar tradutor por nome ou email"
							placeholderTextColor="#9CA3AF"
							accessibilityLabel="Buscar tradutor"
							className="h-9 flex-1 font-inter text-gray-900 text-sm outline-none"
						/>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-3 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						{filteredTranslators.map((translator) => {
							const isSelected = selectedIds.has(translator.id);
							const hasPendingInvite = pendingTranslatorIds.has(translator.id);

							return (
								<TouchableOpacity
									key={translator.id}
									onPress={() => {
										if (hasPendingInvite) return;
										toggleSelect(translator.id);
									}}
									activeOpacity={hasPendingInvite ? 1 : 0.7}
									accessibilityState={{ disabled: hasPendingInvite }}
									className={`flex-row items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 ${
										hasPendingInvite ? 'opacity-50' : ''
									}`}
								>
									<Checkbox
										checked={isSelected}
										onPress={() => {
											if (hasPendingInvite) return;
											toggleSelect(translator.id);
										}}
										accessibilityLabel={`Selecionar tradutor ${translator.name}${
											hasPendingInvite ? ' (convite pendente)' : ''
										}`}
									/>

									<View className="flex-1">
										<Text className="font-inter font-medium text-gray-800 text-sm">
											{translator.name}
										</Text>
										<Text
											className={`font-inter text-xs ${hasPendingInvite ? 'font-medium text-red-900' : 'text-gray-400'}`}
										>
											{hasPendingInvite ? 'Convite pendente' : translator.email}
										</Text>
									</View>
								</TouchableOpacity>
							);
						})}

						{filteredTranslators.length === 0 && (
							<Text className="font-inter text-gray-400 text-sm">
								{translators.length === 0
									? 'Nenhum tradutor cadastrado.'
									: 'Nenhum tradutor encontrado.'}
							</Text>
						)}

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</ScrollView>

					{isConfirmingAll && (
						<View className="gap-3 border-t border-gray-300 bg-gray-50 px-6 py-4">
							<Text className="font-inter text-gray-800 text-sm">
								Enviar o convite por e-mail para {eligibleTranslators.length}{' '}
								tradutores ativos sem convite pendente?
							</Text>
							<View className="flex-row justify-end gap-3">
								<TouchableOpacity
									onPress={() => setIsConfirmingAll(false)}
									disabled={isSubmitting}
									className="rounded-lg border border-gray-300 px-4 py-2"
								>
									<Text className="font-inter font-medium text-gray-800 text-sm">
										Voltar
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() =>
										void handleSubmit(
											eligibleTranslators.map((translator) => translator.id),
										)
									}
									disabled={isSubmitting}
									className={`rounded-lg bg-blue-600 px-4 py-2 ${isSubmitting ? 'opacity-60' : ''}`}
								>
									<Text className="font-inter font-semibold text-sm text-white">
										{isSubmitting ? 'Enviando…' : 'Confirmar envio'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}

					<View className="flex-row flex-wrap items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={() => setIsConfirmingAll(true)}
							disabled={isSubmitting || eligibleTranslators.length === 0}
							accessibilityRole="button"
							accessibilityLabel="Enviar convite para todos os tradutores"
							className={`mr-auto flex-row items-center gap-2 rounded-lg border border-blue-600 px-4 py-2.5 ${
								isSubmitting || eligibleTranslators.length === 0
									? 'opacity-50'
									: ''
							}`}
						>
							<Users size={14} color="#2563EB" />
							<Text className="font-inter font-semibold text-blue-600 text-sm">
								Enviar para todos ({eligibleTranslators.length})
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => void handleSubmit()}
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
