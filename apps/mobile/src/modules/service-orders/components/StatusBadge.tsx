import { View, Text } from 'react-native';
import type { ServiceOrderItemStatus } from '../types/serviceOrder';

const STATUS_LABEL: Record<ServiceOrderItemStatus, string> = {
	pendente: 'Pendente',
	em_andamento: 'Em andamento',
	em_analise: 'Em análise',
	concluida: 'Concluída',
};

const STATUS_STYLE: Record<
	ServiceOrderItemStatus,
	{ bg: string; text: string }
> = {
	pendente: { bg: 'bg-surface-muted', text: 'text-foreground-secondary' },
	em_andamento: { bg: 'bg-primary-soft', text: 'text-primary-strong' },
	em_analise: { bg: 'bg-warning-soft', text: 'text-warning-text' },
	concluida: { bg: 'bg-success-soft', text: 'text-success-text' },
};

type StatusBadgeProps = {
	status: ServiceOrderItemStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
	const style = STATUS_STYLE[status];

	return (
		<View
			className={`self-start rounded-lg px-2.5 py-1 ${style.bg}`}
			accessibilityRole="text"
			accessibilityLabel={`Status: ${STATUS_LABEL[status]}`}
		>
			<Text className={`font-inter font-semibold text-xs ${style.text}`}>
				{STATUS_LABEL[status]}
			</Text>
		</View>
	);
}
