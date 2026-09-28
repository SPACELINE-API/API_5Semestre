import { View, Text } from 'react-native';
import type { InviteStatus } from '../types/invite';

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
	pendente: 'Pendente',
	aceito: 'Aceito',
	recusado: 'Recusado',
	expirado: 'Expirado',
};

const INVITE_STATUS_STYLE: Record<InviteStatus, { bg: string; text: string }> =
	{
		pendente: { bg: 'bg-gray-100', text: 'text-gray-700' },
		aceito: { bg: 'bg-green-50', text: 'text-green-900' },
		recusado: { bg: 'bg-red-50', text: 'text-red-900' },
		expirado: { bg: 'bg-gray-100', text: 'text-gray-400' },
	};

type InviteStatusBadgeProps = {
	status: InviteStatus;
};

export function InviteStatusBadge({ status }: InviteStatusBadgeProps) {
	const style = INVITE_STATUS_STYLE[status];

	return (
		<View
			className={`self-start rounded-lg px-2.5 py-1 ${style.bg}`}
			accessibilityRole="text"
			accessibilityLabel={`Status: ${INVITE_STATUS_LABEL[status]}`}
		>
			<Text className={`font-inter font-semibold text-xs ${style.text}`}>
				{INVITE_STATUS_LABEL[status]}
			</Text>
		</View>
	);
}
