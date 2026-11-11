import { Text, View } from 'react-native';
import type { LinkStatus } from '../types/internalUser';
import { LINK_STATUS_LABELS } from '../utils/departments';

const LINK_STYLES: Record<LinkStatus, { bg: string; text: string }> = {
	pendente: { bg: 'bg-amber-50', text: 'text-amber-800' },
	aceito: { bg: 'bg-green-50', text: 'text-green-800' },
	rejeitado: { bg: 'bg-red-50', text: 'text-red-800' },
	expirado: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export function AccountBadge({ active }: { active: boolean }) {
	return (
		<View
			className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-0.5 ${
				active ? 'bg-green-50' : 'bg-gray-100'
			}`}
		>
			<View
				className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-600' : 'bg-gray-400'}`}
			/>
			<Text
				className={`font-inter font-medium text-xs ${
					active ? 'text-green-800' : 'text-gray-700'
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
