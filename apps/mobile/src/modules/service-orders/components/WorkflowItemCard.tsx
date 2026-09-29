import { View, Text, TouchableOpacity } from 'react-native';
import { ExternalLink, UserPlus } from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { InviteStatusBadge } from './InviteStatusBadge';
import { WorkflowPipeline } from './WorkflowPipeline';
import { openDocument } from '../../../shared/components/FilePreview';
import { getFileName } from '../../../shared/utils/file';
import { formatDate, formatPrice } from '../utils/format';
import { useItemInvites } from '../hooks/useItemInvites';

type WorkflowItemCardProps = {
	item: ServiceOrderItem;
	translatorsById: Map<string, Translator>;
	onInviteTranslators: (item: ServiceOrderItem) => void;
	refreshToken: number;
};

export function WorkflowItemCard({
	item,
	translatorsById,
	onInviteTranslators,
	refreshToken,
}: WorkflowItemCardProps) {
	const { invites, isLoading: isLoadingInvites } = useItemInvites(
		item.id,
		refreshToken,
	);

	const assignedTranslator = item.translator_id
		? translatorsById.get(item.translator_id)
		: null;
	const isAssigned = Boolean(item.translator_id);
	const showInvitesList = !isLoadingInvites && invites.length > 0;

	return (
		<View className="gap-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<View className="flex-row flex-wrap items-start justify-between gap-3">
				<View className="gap-1">
					<Text className="font-inter font-bold text-gray-900 text-base">
						{item.source_language} → {item.target_language}
					</Text>
					<Text className="font-inter text-gray-400 text-xs">
						{item.document_type ?? 'Tipo de documento não informado'}
					</Text>
				</View>

				<StatusBadge status={item.status} />
			</View>

			<WorkflowPipeline
				status={item.status}
				assignedTranslatorName={assignedTranslator?.name}
			/>

			<View className="flex-row flex-wrap gap-x-10 gap-y-3 border-t border-gray-100 pt-5">
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
							accessibilityRole="link"
							onPress={() => openDocument(item.file_url!)}
							className="flex-row items-center gap-1.5 self-start"
						>
							<Text
								className="font-inter-medium text-blue-700 text-sm"
								numberOfLines={1}
							>
								{getFileName(item.file_url)}
							</Text>
							<ExternalLink size={13} color="#1d4ed8" />
						</TouchableOpacity>
					) : (
						<Text className="font-inter font-medium text-gray-400 text-sm">
							Nenhum documento anexado
						</Text>
					)}
				</View>
			</View>

			{isAssigned ? null : (
				<TouchableOpacity
					onPress={() => onInviteTranslators(item)}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Convidar tradutores para ${item.source_language} para ${item.target_language} no workflow`}
					className="flex-row items-center gap-1.5 self-start rounded-lg border border-gray-300 px-3 py-2"
				>
					<UserPlus size={14} color="#353535" />
					<Text className="font-inter font-semibold text-gray-800 text-xs">
						Convidar tradutores
					</Text>
				</TouchableOpacity>
			)}

			{showInvitesList ? (
				<View className="gap-1.5 border-t border-gray-100 pt-4">
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
			) : null}
		</View>
	);
}
