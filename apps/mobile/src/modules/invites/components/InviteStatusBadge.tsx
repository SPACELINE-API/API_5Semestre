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
		pendente: { bg: 'bg-surface-muted', text: 'text-foreground-secondary' },
		aceito: { bg: 'bg-success-soft', text: 'text-success-text' },
		recusado: { bg: 'bg-danger-soft', text: 'text-danger-text' },
		expirado: { bg: 'bg-surface-muted', text: 'text-foreground-subtle' },
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
