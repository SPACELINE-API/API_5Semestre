import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
	FileText,
	ClipboardList,
	Plus,
	ChevronDown,
	ChevronUp,
	Pencil,
} from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { FilePreview } from '../../../shared/components/FilePreview';
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

export function ItemsTable({
	items,
	translatorsById,
	onAddItem,
	onEditItem,
}: ItemsTableProps) {
	const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

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
				const isExpanded = expandedItemId === item.id;

				return (
					<View
						key={item.id}
						className={`py-4 ${index === 0 ? '' : 'border-t border-gray-100'}`}
					>
						<View className="flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-y-2">
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

							<View className="md:w-[14%]">
								{item.file_url ? (
									<TouchableOpacity
										onPress={() =>
											setExpandedItemId(isExpanded ? null : item.id)
										}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel={`${isExpanded ? 'Ocultar' : 'Pré-visualizar'} documento de ${item.source_language} para ${item.target_language}`}
										className="flex-row items-center gap-1"
									>
										<FileText size={14} color="#1C6FB0" />
										<Text className="font-inter font-medium text-blue-600 text-xs">
											{isExpanded ? 'Ocultar' : 'Pré-visualizar'}
										</Text>
										{isExpanded ? (
											<ChevronUp size={14} color="#1C6FB0" />
										) : (
											<ChevronDown size={14} color="#1C6FB0" />
										)}
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

						{isExpanded && item.file_url && (
							<View className="mt-3">
								<FilePreview fileUrl={item.file_url} />
							</View>
						)}
					</View>
				);
			})}
		</View>
	);
}
