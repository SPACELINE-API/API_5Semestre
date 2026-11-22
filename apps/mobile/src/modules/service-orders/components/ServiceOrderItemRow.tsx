import { View, Text, TouchableOpacity } from 'react-native';
import { ExternalLink, UserPlus } from 'lucide-react-native';
import type { ServiceOrderItem, Translator } from '../types/serviceOrder';
import { InviteStatusBadge } from './InviteStatusBadge';
import { openDocument } from '../../../shared/components/FilePreview';
import { getTruncatedFileName } from '../../../shared/utils/file';
import { formatPrice } from '../utils/format';
import { ItemDeadline } from './ItemDeadline';
import { useItemInvites } from '../hooks/useItemInvites';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type ServiceOrderItemRowProps = {
	item: ServiceOrderItem;
	translatorsById: Map<string, Translator>;
	onInviteTranslators: (item: ServiceOrderItem) => void;
	onEditDeadline?: (item: ServiceOrderItem) => void;
	refreshToken: number;
};

export function ServiceOrderItemRow({
	item,
	translatorsById,
	onInviteTranslators,
	onEditDeadline,
	refreshToken,
}: ServiceOrderItemRowProps) {
	const themeColors = useThemeColors();
	const canWriteAssignments = usePermission('assignments.write');
	const { invites, isLoading: isLoadingInvites } = useItemInvites(
		item.id,
		refreshToken,
	);

	const assignedTranslator = item.translator_id
		? translatorsById.get(item.translator_id)
		: null;

	return (
		<View className="gap-4 border-b border-border-subtle py-5">
			<View className="min-w-[220px] gap-1">
				<Text className="font-inter font-semibold text-foreground text-sm">
					{item.source_language} → {item.target_language}
				</Text>
				<Text className="font-inter text-foreground-subtle text-xs">
					{item.document_type ?? 'Tipo de documento não informado'}
				</Text>
			</View>

			<View className="flex-row flex-wrap gap-x-8 gap-y-2">
				<View className="gap-0.5">
					<Text className="font-inter text-foreground-subtle text-xs">
						Preço
					</Text>
					<Text className="font-inter font-medium text-foreground text-sm">
						{formatPrice(item.price)}
					</Text>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-foreground-subtle text-xs">
						Prazo
					</Text>
					<ItemDeadline
						item={item}
						onEdit={onEditDeadline}
						textClassName="font-inter font-medium text-foreground text-sm"
					/>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-foreground-subtle text-xs">
						Tradutor
					</Text>
					<Text className="font-inter font-medium text-foreground text-sm">
						{assignedTranslator?.name ?? 'Não atribuído'}
					</Text>
				</View>

				<View className="gap-0.5">
					<Text className="font-inter text-foreground-subtle text-xs">
						Documento
					</Text>
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
							<ExternalLink size={13} color={themeColors.primaryText} />
						</TouchableOpacity>
					) : (
						<Text className="font-inter font-medium text-foreground-subtle text-sm">
							Nenhum documento anexado
						</Text>
					)}
				</View>
			</View>

			{!item.translator_id && (
				<TouchableOpacity
					onPress={() => onInviteTranslators(item)}
					disabled={!canWriteAssignments}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Convidar tradutores para ${item.source_language} para ${item.target_language}`}
					className={`flex-row items-center gap-1.5 self-start rounded-lg border border-border-strong px-3 py-2 ${!canWriteAssignments ? 'opacity-40' : ''}`}
				>
					<UserPlus size={14} color={themeColors.foreground} />
					<Text className="font-inter font-semibold text-foreground text-xs">
						Convidar tradutores
					</Text>
				</TouchableOpacity>
			)}

			{!isLoadingInvites && invites.length > 0 && (
				<View className="gap-1.5">
					<Text className="font-inter font-semibold text-foreground-secondary text-xs">
						Convites enviados
					</Text>

					{invites.map((invite) => {
						const translator = translatorsById.get(invite.translator_id);

						return (
							<View
								key={invite.id}
								className="flex-row items-center justify-between gap-2"
							>
								<Text className="font-inter text-foreground-secondary text-xs">
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
