import { View, Text, TouchableOpacity } from 'react-native';
import { ClipboardList, ExternalLink, Plus, Pencil } from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { openDocument } from '../../../shared/components/FilePreview';
import { getFileName } from '../../../shared/utils/file';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';
import { formatDate, formatPrice } from '../utils/format';

type ItemsTableProps = {
	items: ServiceOrderItem[];
	translatorsById: Map<string, Translator>;
	onAddItem: () => void;
	onEditItem: (item: ServiceOrderItem) => void;
};

function HeaderCell({ label, width }: { label: string; width: `${number}%` }) {
	return (
		<Text
			style={{ width }}
			className="font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400"
		>
			{label}
		</Text>
	);
}

function AddItemButton({ onPress }: { onPress: () => void }) {
	const isDesktop = useIsDesktop();

	if (!isDesktop) {
		return (
			<TouchableOpacity
				onPress={onPress}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Adicionar item"
				className="h-11 w-11 items-center justify-center self-end rounded-full bg-blue-300"
			>
				<Plus size={20} color="#042C53" />
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="Adicionar item"
			className="flex-row items-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-2"
		>
			<Plus size={14} color="#353535" />
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				Adicionar item
			</Text>
		</TouchableOpacity>
	);
}

function MobileItemCard({
	item,
	translatorName,
	onEdit,
}: {
	item: ServiceOrderItem;
	translatorName: string;
	onEdit: () => void;
}) {
	return (
		<View className="gap-4 rounded-xl border border-gray-200 bg-white p-4">
			<View className="flex-row flex-wrap items-center justify-between gap-2">
				<Text className="flex-1 font-inter font-semibold text-gray-900 text-sm">
					{item.source_language} → {item.target_language}
				</Text>
				<StatusBadge status={item.status} />
			</View>

			<View className="gap-3">
				<View className="flex-row gap-4">
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-gray-400 text-xs">Documento</Text>
						<Text className="font-inter text-gray-700 text-sm">
							{item.document_type ?? 'Não informado'}
						</Text>
						{item.word_count != null && (
							<Text className="font-inter text-gray-400 text-xs">
								{item.word_count} palavras
							</Text>
						)}
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-gray-400 text-xs">Preço</Text>
						<Text className="font-inter text-gray-700 text-sm">
							{formatPrice(item.price)}
						</Text>
					</View>
				</View>

				<View className="flex-row gap-4">
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-gray-400 text-xs">Prazo</Text>
						<Text className="font-inter text-gray-700 text-sm">
							{formatDate(item.deadline)}
						</Text>
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-gray-400 text-xs">Tradutor</Text>
						<Text
							className="font-inter text-gray-700 text-sm"
							numberOfLines={2}
						>
							{translatorName}
						</Text>
					</View>
				</View>

				<View className="flex-row items-center justify-between gap-4 border-t border-gray-100 pt-3">
					{item.file_url ? (
						<TouchableOpacity
							accessibilityRole="link"
							onPress={() => openDocument(item.file_url!)}
							className="min-w-0 max-w-[70%] flex-row items-center gap-1.5"
						>
							<Text
								className="min-w-0 flex-shrink font-inter-medium text-blue-700 text-xs"
								numberOfLines={1}
							>
								{getFileName(item.file_url)}
							</Text>
							<ExternalLink size={12} color="#1d4ed8" />
						</TouchableOpacity>
					) : (
						<Text className="font-inter text-gray-400 text-xs">
							Nenhum documento
						</Text>
					)}
					<TouchableOpacity
						onPress={onEdit}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Editar item de ${item.source_language} para ${item.target_language}`}
						className="flex-row items-center gap-1 self-start py-1"
					>
						<Pencil size={14} color="#353535" />
						<Text className="font-inter font-medium text-gray-700 text-xs">
							Editar
						</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}

export function ItemsTable({
	items,
	translatorsById,
	onAddItem,
	onEditItem,
}: ItemsTableProps) {
	const isDesktop = useIsDesktop();

	if (items.length === 0) {
		return (
			<View className="items-center justify-center gap-4 py-12">
				<View className="items-center">
					<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
						<ClipboardList size={18} color="#9CA3AF" />
					</View>

					<Text className="font-inter font-medium text-gray-800 text-sm">
						Esta ordem de serviço não possui itens
					</Text>
				</View>

				<AddItemButton onPress={onAddItem} />
			</View>
		);
	}

	if (!isDesktop) {
		return (
			<View className="gap-4">
				<AddItemButton onPress={onAddItem} />
				{items.map((item) => {
					const translator = item.translator_id
						? translatorsById.get(item.translator_id)
						: null;
					return (
						<MobileItemCard
							key={item.id}
							item={item}
							translatorName={translator?.name ?? 'Não atribuído'}
							onEdit={() => onEditItem(item)}
						/>
					);
				})}
			</View>
		);
	}

	return (
		<View className="gap-4 bg-white">
			<AddItemButton onPress={onAddItem} />

			<View className="hidden h-11 flex-row items-center border-b border-gray-200 md:flex">
				<HeaderCell label="Idiomas" width="16%" />
				<HeaderCell label="Documento" width="14%" />
				<HeaderCell label="Preço" width="10%" />
				<HeaderCell label="Prazo" width="10%" />
				<HeaderCell label="Status" width="12%" />
				<HeaderCell label="Tradutor" width="14%" />
				<HeaderCell label="Arquivo" width="14%" />
				<HeaderCell label="Ações" width="10%" />
			</View>

			{items.map((item, index) => {
				const translator = item.translator_id
					? translatorsById.get(item.translator_id)
					: null;
				return (
					<View
						key={item.id}
						className={`py-4 ${index === 0 ? '' : 'border-t border-gray-100'}`}
					>
						<View className="flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-0 md:gap-y-2">
							<View className="md:w-[16%]">
								<Text className="font-inter font-semibold text-gray-900 text-sm">
									{item.source_language} → {item.target_language}
								</Text>
							</View>

							<View className="md:w-[14%]">
								<Text className="font-inter text-gray-500 text-xs md:text-sm">
									{item.document_type ?? 'Não informado'}
								</Text>
								{item.word_count != null && (
									<Text className="font-inter text-gray-400 text-xs">
										{item.word_count} palavras
									</Text>
								)}
							</View>

							<View className="md:w-[10%]">
								<Text className="font-inter text-gray-600 text-sm">
									{formatPrice(item.price)}
								</Text>
							</View>

							<View className="md:w-[10%]">
								<Text className="font-inter text-gray-600 text-sm">
									{formatDate(item.deadline)}
								</Text>
							</View>

							<View className="md:w-[12%]">
								<StatusBadge status={item.status} />
							</View>

							<View className="md:w-[14%]">
								<Text className="font-inter text-gray-600 text-sm">
									{translator?.name ?? 'Não atribuído'}
								</Text>
							</View>

							<View className="min-w-0 md:w-[14%]">
								{item.file_url ? (
									<TouchableOpacity
										accessibilityRole="link"
										onPress={() => openDocument(item.file_url!)}
										className="min-w-0 max-w-full flex-row items-center gap-1.5"
									>
										<Text
											className="min-w-0 flex-shrink font-inter-medium text-blue-700 text-xs"
											numberOfLines={1}
										>
											{getFileName(item.file_url)}
										</Text>
										<ExternalLink size={12} color="#1d4ed8" />
									</TouchableOpacity>
								) : (
									<Text className="font-inter text-gray-400 text-xs">
										Nenhum
									</Text>
								)}
							</View>

							<View className="md:w-[10%]">
								<TouchableOpacity
									onPress={() => onEditItem(item)}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityLabel={`Editar item de ${item.source_language} para ${item.target_language}`}
									className="flex-row items-center gap-1 self-start"
								>
									<Pencil size={14} color="#353535" />
									<Text className="font-inter font-medium text-gray-700 text-xs">
										Editar
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				);
			})}
		</View>
	);
}
