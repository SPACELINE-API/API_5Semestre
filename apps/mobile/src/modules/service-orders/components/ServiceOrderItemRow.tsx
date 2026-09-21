import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
	UserPlus,
	FileText,
	ChevronDown,
	ChevronUp,
} from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { InviteStatusBadge } from './InviteStatusBadge';
import { FilePreview } from '../../../shared/components/FilePreview';
import { formatDate, formatPrice } from '../utils/format';
import { useItemInvites } from '../hooks/useItemInvites';

type ServiceOrderItemRowProps = {
	item: ServiceOrderItem;
	translatorsById: Map<string, Translator>;
	onInviteTranslators: (item: ServiceOrderItem) => void;
	refreshToken: number;
};

export function ServiceOrderItemRow({
	item,
	translatorsById,
	onInviteTranslators,
	refreshToken,
}: ServiceOrderItemRowProps) {
	const { invites, isLoading: isLoadingInvites } = useItemInvites(
		item.id,
		refreshToken,
	);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);

	const assignedTranslator = item.translator_id
		? translatorsById.get(item.translator_id)
		: null;

	return (
		<View className="gap-4 border-b border-gray-100 py-5">
			<View className="min-w-[220px] gap-1">
				<Text className="font-inter font-semibold text-gray-900 text-sm">
					{item.source_language} → {item.target_language}
				</Text>
				<Text className="font-inter text-gray-400 text-xs">
					{item.document_type ?? 'Tipo de documento não informado'}
				</Text>
			</View>

			<View className="flex-row flex-wrap gap-x-8 gap-y-2">
				<View className="gap-0.5">
					<Text className="font-inter text-gray-400 text-xs">Preço</Text>
					<Text className="font-inter font-medium text-gray-800 text-sm">
						{formatPrice(item.price)}
					</Text>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-gray-400 text-xs">Prazo</Text>
					<Text className="font-inter font-medium text-gray-800 text-sm">
						{formatDate(item.deadline)}
					</Text>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-gray-400 text-xs">Tradutor</Text>
					<Text className="font-inter font-medium text-gray-800 text-sm">
						{assignedTranslator?.name ?? 'Não atribuído'}
					</Text>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-gray-400 text-xs">Documento</Text>
					{item.file_url ? (
						<TouchableOpacity
							onPress={() => setIsPreviewOpen((current) => !current)}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={`${isPreviewOpen ? 'Ocultar' : 'Pré-visualizar'} documento`}
							className="flex-row items-center gap-1"
						>
							<FileText size={14} color="#1C6FB0" />
							<Text className="font-inter font-medium text-blue-600 text-sm">
								{isPreviewOpen ? 'Ocultar' : 'Pré-visualizar'}
							</Text>
							{isPreviewOpen ? (
								<ChevronUp size={14} color="#1C6FB0" />
							) : (
								<ChevronDown size={14} color="#1C6FB0" />
							)}
						</TouchableOpacity>
					) : (
						<Text className="font-inter font-medium text-gray-400 text-sm">
							Nenhum documento anexado
						</Text>
					)}
				</View>
			</View>

			{isPreviewOpen && item.file_url && (
				<FilePreview fileUrl={item.file_url} />
			)}

			{!item.translator_id && (
				<TouchableOpacity
					onPress={() => onInviteTranslators(item)}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Convidar tradutores para ${item.source_language} para ${item.target_language}`}
					className="flex-row items-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-2"
				>
					<UserPlus size={14} color="#353535" />
					<Text className="font-inter font-semibold text-gray-800 text-xs">
						Convidar tradutores
					</Text>
				</TouchableOpacity>
			)}

			{!isLoadingInvites && invites.length > 0 && (
				<View className="gap-1.5">
					<Text className="font-inter font-semibold text-gray-700 text-xs">
						Convites enviados
					</Text>

					{invites.map((invite) => {
						const translator = translatorsById.get(invite.translator_id);

						return (
							<View
								key={invite.id}
								className="flex-row items-center justify-between gap-2"
							>
								<Text className="font-inter text-gray-600 text-xs">
									{translator?.name ?? invite.translator_id}
								</Text>
								<InviteStatusBadge status={invite.status} />
							</View>
						);
					})}
				</View>
			)}
		</View>
	);
}
