import { View, Text, TouchableOpacity } from 'react-native';
import {
	ClipboardList,
	ExternalLink,
	Plus,
	Pencil,
	Trash2,
} from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { openDocument } from '../../../shared/components/FilePreview';
import { getTruncatedFileName } from '../../../shared/utils/file';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';
import { formatPrice, formatDeadline } from '../utils/format';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type ItemsTableProps = {
	items: ServiceOrderItem[];
	translatorsById: Map<string, Translator>;
	onAddItem?: () => void;
	onEditItem?: (item: ServiceOrderItem) => void;
	onDeleteItem?: (item: ServiceOrderItem) => void;
	isInServiceOrder?: boolean;
	layout?: 'table' | 'cards';
};

function HeaderCell({ label, width }: { label: string; width: `${number}%` }) {
	return (
		<Text
			style={{ width }}
			className="font-inter font-medium text-[12px] uppercase tracking-wide text-foreground-subtle"
		>
			{label}
		</Text>
	);
}

function AddItemButton({
	onPress,
	layout = 'table',
}: {
	onPress: () => void;
	layout?: 'table' | 'cards';
}) {
	const themeColors = useThemeColors();
	const isDesktop = useIsDesktop();
	const canWriteServiceOrders = usePermission('service_orders.write');

	if (!isDesktop && layout === 'table') {
		return (
			<TouchableOpacity
				onPress={onPress}
				disabled={!canWriteServiceOrders}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Adicionar item"
				className={`h-11 w-11 items-center justify-center self-end rounded-full bg-primary ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
			>
				<Plus size={20} color={themeColors.primaryStrong} />
			</TouchableOpacity>
		);
	}

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={!canWriteServiceOrders}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel="Adicionar item"
			className={`flex-row items-center justify-center gap-2 self-start rounded-lg border border-dashed border-border-strong px-4 py-2.5 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
		>
			<Plus size={14} color={themeColors.foreground} />
			<Text className="font-inter-medium text-sm text-foreground-secondary">
				Adicionar item
			</Text>
		</TouchableOpacity>
	);
}

function ItemCard({
	item,
	translatorName,
	onEdit,
	onDelete,
	isInServiceOrder = false,
}: {
	item: ServiceOrderItem;
	translatorName: string;
	onEdit: () => void;
	onDelete: () => void;
	isInServiceOrder?: boolean;
}) {
	const themeColors = useThemeColors();
	const canWriteServiceOrders = usePermission('service_orders.write');
	return (
		<View className="gap-4 rounded-xl border border-border bg-surface p-4">
			<View className="flex-row flex-wrap items-center justify-between gap-2">
				<Text className="flex-1 font-inter font-semibold text-foreground text-sm">
					{item.source_language} → {item.target_language}
				</Text>
				<StatusBadge status={item.status} />
			</View>

			<View className="gap-3">
				<View className="flex-row gap-4">
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-foreground-subtle text-xs">
							Documento
						</Text>
						<Text className="font-inter text-foreground-secondary text-sm">
							{item.document_type ?? 'Não informado'}
						</Text>
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-foreground-subtle text-xs">
							Preço
						</Text>
						<Text className="font-inter text-foreground-secondary text-sm">
							{formatPrice(item.price)}
						</Text>
					</View>
				</View>

				<View className="flex-row gap-4">
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-foreground-subtle text-xs">
							Prazo
						</Text>
						<Text className="font-inter text-foreground-secondary text-sm">
							{formatDeadline(item.deadline)}
						</Text>
					</View>
					<View className="min-w-0 flex-1 gap-1">
						<Text className="font-inter text-foreground-subtle text-xs">
							Tradutor
						</Text>
						<Text
							className="font-inter text-foreground-secondary text-sm"
							numberOfLines={2}
						>
							{translatorName}
						</Text>
					</View>
				</View>

				<View className="flex-row flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border-subtle pt-3">
					{item.file_url ? (
						<TouchableOpacity
							accessibilityRole="link"
							onPress={() => openDocument(item.file_url!)}
							className="min-w-0 max-w-full flex-row items-center gap-1 self-start"
						>
							<Text
								className="min-w-0 flex-shrink font-inter-medium text-primary-text text-xs"
								numberOfLines={1}
							>
								{getTruncatedFileName(item.file_url)}
							</Text>
							<ExternalLink size={12} color={themeColors.primaryText} />
						</TouchableOpacity>
					) : (
						<Text className="min-w-0 flex-1 font-inter text-foreground-subtle text-xs">
							Nenhum documento
						</Text>
					)}
					{!isInServiceOrder && (
						<View className="flex-row flex-nowrap items-center gap-x-4">
							<TouchableOpacity
								onPress={onEdit}
								disabled={!canWriteServiceOrders}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel={`Editar item de ${item.source_language} para ${item.target_language}`}
								className={`flex-row items-center gap-1 self-start py-1 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
							>
								<Pencil size={14} color={themeColors.foreground} />
								<Text className="font-inter font-medium text-foreground-secondary text-xs">
									Editar
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={onDelete}
								disabled={!canWriteServiceOrders}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel={`Excluir item de ${item.source_language} para ${item.target_language}`}
								className={`flex-row items-center gap-1 self-start py-1 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
							>
								<Trash2 size={14} color={themeColors.danger} />
								<Text className="font-inter font-medium text-danger text-xs">
									Excluir
								</Text>
							</TouchableOpacity>
						</View>
					)}
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
	onDeleteItem,
	isInServiceOrder = false,
	layout = 'table',
}: ItemsTableProps) {
	const themeColors = useThemeColors();
	const isDesktop = useIsDesktop();
	const canWriteServiceOrders = usePermission('service_orders.write');

	if (items.length === 0 && layout === 'cards') {
		return (
			<View className="gap-3">
				<Text className="font-inter text-sm text-foreground-muted">
					Este orçamento ainda não possui itens.
				</Text>
				{!isInServiceOrder && (
					<AddItemButton onPress={onAddItem!} layout={layout} />
				)}
			</View>
		);
	}

	if (items.length === 0) {
		return (
			<View className="items-center justify-center gap-4 py-12">
				<View className="items-center">
					<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
						<ClipboardList size={18} color={themeColors.foregroundSubtle} />
					</View>

					<Text className="font-inter font-medium text-foreground text-sm">
						Esta ordem de serviço não possui itens
					</Text>
				</View>

				{!isInServiceOrder && (
					<AddItemButton onPress={onAddItem!} layout={layout} />
				)}
			</View>
		);
	}

	if (!isDesktop || layout === 'cards') {
		return (
			<View className="gap-4">
				{items.map((item) => {
					const translator = item.translator_id
						? translatorsById.get(item.translator_id)
						: null;
					return (
						<ItemCard
							key={item.id}
							item={item}
							translatorName={translator?.name ?? 'Não atribuído'}
							onEdit={() => onEditItem!(item)}
							onDelete={() => onDeleteItem!(item)}
							isInServiceOrder={isInServiceOrder}
						/>
					);
				})}
				{!isInServiceOrder && (
					<AddItemButton onPress={onAddItem!} layout={layout} />
				)}
			</View>
		);
	}

	return (
		<View className="gap-4 bg-surface">
			{!isInServiceOrder && (
				<AddItemButton onPress={onAddItem!} layout={layout} />
			)}

			<View className="hidden h-11 flex-row items-center border-b border-border md:flex">
				<HeaderCell label="Idiomas" width="16%" />
				<HeaderCell label="Documento" width="14%" />
				<HeaderCell label="Preço" width="10%" />
				<HeaderCell label="Prazo" width="10%" />
				<HeaderCell label="Status" width="12%" />
				<HeaderCell label="Tradutor" width="14%" />
				<HeaderCell label="Arquivo" width="14%" />
				{!isInServiceOrder && <HeaderCell label="Ações" width="10%" />}
			</View>

			{items.map((item, index) => {
				const translator = item.translator_id
					? translatorsById.get(item.translator_id)
					: null;
				return (
					<View
						key={item.id}
						className={`${index === 0 ? 'pt-2 pb-4' : 'border-t border-border-subtle py-4'}`}
					>
						<View className="flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-x-0 md:gap-y-2">
							<View className="md:w-[16%]">
								<Text className="font-inter font-semibold text-foreground text-sm">
									{item.source_language} → {item.target_language}
								</Text>
							</View>

							<View className="md:w-[12%]">
								<Text className="font-inter text-foreground-muted text-xs md:text-sm">
									{item.document_type ?? 'Não informado'}
								</Text>
							</View>

							<View className="md:w-[10%]">
								<Text className="font-inter text-foreground-secondary text-sm">
									{formatPrice(item.price)}
								</Text>
							</View>

							<View className="md:w-[10%]">
								<Text className="font-inter text-foreground-secondary text-sm">
									{formatDeadline(item.deadline)}
								</Text>
							</View>

							<View className="md:w-[12%]">
								<StatusBadge status={item.status} />
							</View>

							<View className="md:w-[14%]">
								<Text className="font-inter text-foreground-secondary text-sm">
									{translator?.name ?? 'Não atribuído'}
								</Text>
							</View>

							<View className="min-w-0 md:w-[14%]">
								{item.file_url ? (
									<TouchableOpacity
										accessibilityRole="link"
										onPress={() => openDocument(item.file_url!)}
										className="min-w-0 max-w-full flex-row items-center gap-1"
									>
										<Text
											className="min-w-0 flex-shrink font-inter-medium text-primary-text text-xs"
											numberOfLines={1}
										>
											{getTruncatedFileName(item.file_url)}
										</Text>
										<ExternalLink size={12} color={themeColors.primaryText} />
									</TouchableOpacity>
								) : (
									<Text className="font-inter text-foreground-subtle text-xs">
										Nenhum
									</Text>
								)}
							</View>

							{!isInServiceOrder && (
								<View className="md:w-[12%]">
									<TouchableOpacity
										onPress={() => onEditItem!(item)}
										disabled={!canWriteServiceOrders}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel={`Editar item de ${item.source_language} para ${item.target_language}`}
										className={`mb-1 flex-row items-center gap-2 self-start rounded-md px-1.5 py-1 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
									>
										<Pencil size={14} color={themeColors.foreground} />
										<Text className="font-inter font-medium text-foreground-secondary text-sm">
											Editar
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => onDeleteItem!(item)}
										disabled={!canWriteServiceOrders}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel={`Excluir item de ${item.source_language} para ${item.target_language}`}
										className={`flex-row items-center gap-2 self-start rounded-md px-1.5 py-1 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
									>
										<Trash2 size={14} color={themeColors.danger} />
										<Text className="font-inter font-medium text-danger text-sm">
											Excluir
										</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>
				);
			})}
		</View>
	);
}
