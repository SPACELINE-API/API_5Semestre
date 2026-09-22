import { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	ScrollView,
} from 'react-native';
import { Search, Check, Send } from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { InviteStatusBadge } from './InviteStatusBadge';
import { useItemInvites } from '../hooks/useItemInvites';

type TranslatorsInviteTabProps = {
	items: ServiceOrderItem[];
	translators: Translator[];
	translatorsById: Map<string, Translator>;
	refreshToken: number;
	onSendInvites: (itemId: string, translatorIds: string[]) => Promise<void>;
};

export function TranslatorsInviteTab({
	items,
	translators,
	translatorsById,
	refreshToken,
	onSendInvites,
}: TranslatorsInviteTabProps) {
	const [selectedItemId, setSelectedItemId] = useState(
		items.find((item) => !item.translator_id)?.id ?? items[0]?.id ?? '',
	);
	const [search, setSearch] = useState('');
	const [selectedTranslatorIds, setSelectedTranslatorIds] = useState<
		Set<string>
	>(new Set());
	const [isSending, setIsSending] = useState(false);

	const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
	const { invites, isLoading: isLoadingInvites } = useItemInvites(
		selectedItemId,
		refreshToken,
	);
	const isItemAssigned = Boolean(selectedItem?.translator_id);

	const pendingTranslatorIds = useMemo(
		() =>
			new Set(
				invites
					.filter((invite) => invite.status === 'pendente')
					.map((invite) => invite.translator_id),
			),
		[invites],
	);

	useEffect(() => {
		setSelectedTranslatorIds(new Set());
	}, [selectedItemId]);

	const filteredTranslators = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return translators;
		return translators.filter(
			(translator) =>
				translator.name.toLowerCase().includes(query) ||
				translator.email.toLowerCase().includes(query),
		);
	}, [translators, search]);

	function toggleTranslator(id: string) {
		setSelectedTranslatorIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	async function handleSend() {
		if (!selectedItemId || selectedTranslatorIds.size === 0) return;

		setIsSending(true);
		try {
			await onSendInvites(selectedItemId, Array.from(selectedTranslatorIds));
			setSelectedTranslatorIds(new Set());
		} finally {
			setIsSending(false);
		}
	}

	if (items.length === 0) {
		return (
			<Text className="font-inter text-gray-400 text-sm">
				Esta ordem de serviço não possui itens.
			</Text>
		);
	}

	return (
		<View className="gap-5">
			<View className="gap-1.5">
				<Text className="font-inter font-semibold text-gray-800 text-xs">
					Item da ordem
				</Text>

				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					<View className="flex-row gap-2">
						{items.map((item) => {
							const isSelected = item.id === selectedItemId;
							const isAssigned = Boolean(item.translator_id);

							return (
								<TouchableOpacity
									key={item.id}
									onPress={() => {
										if (isAssigned) return;
										setSelectedItemId(item.id);
									}}
									activeOpacity={isAssigned ? 1 : 0.7}
									accessibilityRole="radio"
									accessibilityState={{
										checked: isSelected,
										disabled: isAssigned,
									}}
									accessibilityLabel={`Selecionar item ${item.source_language} para ${item.target_language}${
										isAssigned ? ' (já possui tradutor)' : ''
									}`}
									className={`rounded-lg border px-3 py-2 ${
										isAssigned
											? 'border-gray-100 bg-gray-50 opacity-50'
											: isSelected
												? 'border-blue-400 bg-blue-50'
												: 'border-gray-200 bg-white hover:bg-gray-50'
									}`}
								>
									<Text className="font-inter font-medium text-gray-800 text-sm">
										{item.source_language} → {item.target_language}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>
				</ScrollView>
			</View>

			{selectedItem?.translator_id && (
				<View className="rounded-lg bg-gray-50 px-3.5 py-3">
					<Text className="font-inter text-gray-500 text-xs">
						Este item já tem um tradutor atribuído:{' '}
						{translatorsById.get(selectedItem.translator_id)?.name ??
							selectedItem.translator_id}
						. Não é possível enviar novos convites para ele — selecione outro
						item.
					</Text>
				</View>
			)}

			<View
				className={`flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 ${
					isItemAssigned ? 'opacity-50' : ''
				}`}
			>
				<Search size={16} color="#9CA3AF" />
				<TextInput
					value={search}
					onChangeText={setSearch}
					editable={!isItemAssigned}
					placeholder="Buscar tradutor por nome ou email"
					placeholderTextColor="#9CA3AF"
					className="flex-1 font-inter text-sm text-gray-900 outline-none"
					accessibilityLabel="Buscar tradutor"
				/>
			</View>

			<View
				className={`rounded-xl border border-gray-200 overflow-hidden ${
					isItemAssigned ? 'opacity-50' : ''
				}`}
			>
				<View className="flex-row items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
					<Text className="w-6" />
					<Text className="flex-1 font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
						Nome
					</Text>
					<Text className="flex-1 font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
						Email
					</Text>
					<Text className="w-24 font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
						Status
					</Text>
				</View>

				{filteredTranslators.map((translator) => {
					const isSelected = selectedTranslatorIds.has(translator.id);
					const hasPendingInvite = pendingTranslatorIds.has(translator.id);
					const isDisabled = isItemAssigned || hasPendingInvite;

					return (
						<TouchableOpacity
							key={translator.id}
							onPress={() => {
								if (isDisabled) return;
								toggleTranslator(translator.id);
							}}
							activeOpacity={isDisabled ? 1 : 0.7}
							accessibilityRole="checkbox"
							accessibilityState={{ checked: isSelected, disabled: isDisabled }}
							accessibilityLabel={`Selecionar tradutor ${translator.name}${
								hasPendingInvite ? ' (convite pendente)' : ''
							}`}
							className={`flex-row items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-b-0 ${
								hasPendingInvite
									? 'opacity-50'
									: isSelected
										? 'bg-blue-50'
										: 'hover:bg-gray-50'
							}`}
						>
							<View
								className={`h-[18px] w-[18px] items-center justify-center rounded border ${
									isSelected
										? 'border-blue-600 bg-blue-600'
										: 'border-gray-300 bg-white'
								}`}
							>
								{isSelected && <Check size={12} color="#FFFFFF" />}
							</View>
							<Text className="flex-1 font-inter font-medium text-gray-800 text-sm">
								{translator.name}
							</Text>
							<Text className="flex-1 font-inter text-gray-500 text-sm">
								{translator.email}
							</Text>
							<View className="w-24 flex-row items-center gap-1.5">
								{hasPendingInvite ? (
									<Text className="font-inter text-gray-500 text-xs">
										Convite pendente
									</Text>
								) : (
									<>
										<View
											className={`h-2 w-2 rounded-full ${
												translator.is_active ? 'bg-green-500' : 'bg-gray-300'
											}`}
										/>
										<Text className="font-inter text-gray-500 text-xs">
											{translator.is_active ? 'Ativo' : 'Inativo'}
										</Text>
									</>
								)}
							</View>
						</TouchableOpacity>
					);
				})}

				{filteredTranslators.length === 0 && (
					<Text className="px-4 py-3 font-inter text-gray-400 text-sm">
						Nenhum tradutor encontrado.
					</Text>
				)}
			</View>

			<TouchableOpacity
				onPress={handleSend}
				disabled={
					isSending || selectedTranslatorIds.size === 0 || isItemAssigned
				}
				activeOpacity={0.85}
				accessibilityRole="button"
				accessibilityLabel="Enviar convites para os tradutores selecionados"
				className={`flex-row items-center gap-2 self-start rounded-lg bg-blue-600 px-5 py-2.5 ${
					isSending || selectedTranslatorIds.size === 0 || isItemAssigned
						? 'opacity-50'
						: ''
				}`}
			>
				<Send size={14} color="#FFFFFF" />
				<Text className="font-inter font-semibold text-white text-sm">
					{isSending
						? 'Enviando…'
						: `Enviar convites (${selectedTranslatorIds.size})`}
				</Text>
			</TouchableOpacity>

			{!isLoadingInvites && invites.length > 0 && (
				<View className="gap-2 border-t border-gray-100 pt-5">
					<Text className="font-inter font-semibold text-gray-700 text-xs uppercase tracking-wide">
						Convites deste item
					</Text>

					{invites.map((invite) => (
						<View
							key={invite.id}
							className="flex-row items-center justify-between gap-2"
						>
							<Text className="font-inter text-gray-600 text-sm">
								{translatorsById.get(invite.translator_id)?.name ??
									invite.translator_id}
							</Text>
							<InviteStatusBadge status={invite.status} />
						</View>
					))}
				</View>
			)}
		</View>
	);
}
