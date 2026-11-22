import { Text, TouchableOpacity, View } from 'react-native';
import { CalendarPlus, Pencil } from 'lucide-react-native';
import type { ServiceOrderItem } from '../types/serviceOrder';
import { formatDeadline } from '../utils/format';
import { usePermission } from '../../auth/hooks/usePermission';
import { useThemeColors } from '../../../shared/theme/ThemeProvider';

type ItemDeadlineProps = {
	item: ServiceOrderItem;
	onEdit?: (item: ServiceOrderItem) => void;
	textClassName?: string;
};

export function ItemDeadline({
	item,
	onEdit,
	textClassName = 'font-inter text-foreground-secondary text-sm',
}: ItemDeadlineProps) {
	const themeColors = useThemeColors();
	const canWrite = usePermission('service_orders.write');
	const canEdit = canWrite && Boolean(onEdit);
	const label = `${item.source_language} para ${item.target_language}`;

	if (!item.deadline) {
		if (!canEdit) return <Text className={textClassName}>Sem prazo</Text>;
		return (
			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={`Definir prazo do documento ${label}`}
				onPress={() => onEdit?.(item)}
				activeOpacity={0.7}
				className="shrink-0 flex-row items-center gap-1.5 self-start rounded-lg border border-primary/30 bg-primary-soft px-2.5 py-1.5"
			>
				<CalendarPlus size={13} color={themeColors.primaryText} />
				<Text
					numberOfLines={1}
					className="font-inter font-medium text-primary-text text-xs"
				>
					Definir prazo
				</Text>
			</TouchableOpacity>
		);
	}

	return (
		<View className="flex-row items-center gap-2">
			<Text className={textClassName}>{formatDeadline(item.deadline)}</Text>
			{canEdit ? (
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel={`Alterar prazo do documento ${label}`}
					onPress={() => onEdit?.(item)}
					hitSlop={8}
					activeOpacity={0.7}
				>
					<Pencil size={13} color={themeColors.foregroundMuted} />
				</TouchableOpacity>
			) : null}
		</View>
	);
}
