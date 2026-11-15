import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../../../shared/components/TabBar';
import {
	getAuthorizationContext,
	subscribeAuthorizationContext,
} from '../services/auth';
import { hasFullRouteAccess } from '../services/authorization';

export type SettingsTab = 'permissoes' | 'pessoas' | 'sessao';

const TAB_LABELS: Record<SettingsTab, string> = {
	permissoes: 'Permissões',
	pessoas: 'Pessoas',
	sessao: 'Sessão',
};

export function SettingsHeader({ active }: { active: SettingsTab }) {
	const router = useRouter();
	const context = useSyncExternalStore(
		subscribeAuthorizationContext,
		getAuthorizationContext,
		getAuthorizationContext,
	);

	const tabs: { key: SettingsTab; label: string }[] = [
		{ key: 'permissoes', label: TAB_LABELS.permissoes },
		...(hasFullRouteAccess(context)
			? [{ key: 'pessoas' as const, label: TAB_LABELS.pessoas }]
			: []),
		{ key: 'sessao', label: TAB_LABELS.sessao },
	];

	function changeTab(tab: SettingsTab) {
		if (tab === active) return;
		router.replace(`/configuracoes/${tab}` as never);
	}

	return (
		<View className="mb-6 gap-4">
			<View>
				<Text className="font-inter font-bold text-gray-950 text-2xl">
					Configurações
				</Text>
				<Text className="mt-2 font-inter text-gray-500 text-sm">
					Gerencie as permissões dos perfis e as pessoas da plataforma.
				</Text>
			</View>
			<TabBar tabs={tabs} activeTab={active} onTabChange={changeTab} />
		</View>
	);
}
