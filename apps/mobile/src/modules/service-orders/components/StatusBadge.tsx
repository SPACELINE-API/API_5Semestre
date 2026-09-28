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
	pendente: { bg: 'bg-gray-100', text: 'text-gray-700' },
	em_andamento: { bg: 'bg-blue-50', text: 'text-blue-900' },
	em_analise: { bg: 'bg-yellow-50', text: 'text-yellow-900' },
	concluida: { bg: 'bg-green-50', text: 'text-green-900' },
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
