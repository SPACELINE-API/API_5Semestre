import { Text, View } from 'react-native';
import type { LinkStatus } from '../types/internalUser';
import { LINK_STATUS_LABELS } from '../utils/departments';

const LINK_STYLES: Record<LinkStatus, { bg: string; text: string }> = {
	pendente: { bg: 'bg-warning-soft', text: 'text-warning-text' },
	aceito: { bg: 'bg-success-soft', text: 'text-success-text' },
	rejeitado: { bg: 'bg-danger-soft', text: 'text-danger-text' },
	expirado: { bg: 'bg-surface-muted', text: 'text-foreground-secondary' },
	cancelado: { bg: 'bg-surface-muted', text: 'text-foreground-secondary' },
};

export function AccountBadge({ active }: { active: boolean }) {
	return (
		<View
			className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
				active ? 'bg-success-soft' : 'bg-surface-muted'
			}`}
		>
			<View
				className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-success' : 'bg-foreground-subtle'}`}
			/>
			<Text
				className={`font-inter font-medium text-xs ${
					active ? 'text-success-text' : 'text-foreground-secondary'
				}`}
			>
				{active ? 'Ativa' : 'Inativa'}
			</Text>
		</View>
	);
}

export function LinkBadge({ status }: { status: LinkStatus }) {
	const style = LINK_STYLES[status];
	return (
		<View className={`rounded-full px-2.5 py-0.5 ${style.bg}`}>
			<Text className={`font-inter font-medium text-xs ${style.text}`}>
				Link: {LINK_STATUS_LABELS[status]}
			</Text>
		</View>
	);
}
