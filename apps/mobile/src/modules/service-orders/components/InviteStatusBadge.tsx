import { View, Text } from 'react-native';
import type { InviteStatus } from '../types/serviceOrder';

const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
	pendente: 'Pendente',
	aceito: 'Aceito',
	recusado: 'Recusado',
	expirado: 'Expirado',
};

const INVITE_STATUS_STYLE: Record<InviteStatus, { bg: string; text: string }> =
	{
		pendente: { bg: 'bg-primary-soft', text: 'text-primary-strong' },
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
		<View className={`self-start rounded-md px-2 py-0.5 ${style.bg}`}>
			<Text className={`font-inter font-medium text-xs ${style.text}`}>
				{INVITE_STATUS_LABEL[status]}
			</Text>
		</View>
	);
}
