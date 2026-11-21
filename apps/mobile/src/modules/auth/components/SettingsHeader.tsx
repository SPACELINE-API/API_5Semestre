import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../../../shared/components/TabBar';
import {
	getAuthorizationContext,
	subscribeAuthorizationContext,
} from '../services/auth';
import { hasFullRouteAccess, hasPermission } from '../services/authorization';

export type SettingsTab = 'permissoes' | 'pessoas' | 'idiomas' | 'sessao';

const TAB_LABELS: Record<SettingsTab, string> = {
	permissoes: 'Permissões',
	pessoas: 'Pessoas',
	idiomas: 'Idiomas',
	sessao: 'Sessão',
};

export function SettingsHeader({ active }: { active: SettingsTab }) {
	const router = useRouter();
	const context = useSyncExternalStore(
		subscribeAuthorizationContext,
		getAuthorizationContext,
		getAuthorizationContext,
	);

	const canReadPermissions = hasPermission(context, 'roles.read');
	const canReadSession =
		hasPermission(context, 'settings.read') ||
		hasPermission(context, 'settings.write');
	const tabs: { key: SettingsTab; label: string }[] = [
		...(canReadPermissions
			? [{ key: 'permissoes' as const, label: TAB_LABELS.permissoes }]
			: []),
		...(hasFullRouteAccess(context)
			? [
					{ key: 'pessoas' as const, label: TAB_LABELS.pessoas },
					{ key: 'idiomas' as const, label: TAB_LABELS.idiomas },
				]
			: []),
		...(canReadSession
			? [{ key: 'sessao' as const, label: TAB_LABELS.sessao }]
			: []),
	];

	function changeTab(tab: SettingsTab) {
		if (tab === active) return;
		router.replace(`/configuracoes/${tab}` as never);
	}

	return (
		<View className="mb-6 gap-4">
			<View>
				<Text className="font-inter font-bold text-foreground text-2xl">
					Configurações
				</Text>
				<Text className="mt-2 font-inter text-foreground-muted text-sm">
					Gerencie idiomas, permissões e pessoas da plataforma.
				</Text>
			</View>
			<TabBar tabs={tabs} activeTab={active} onTabChange={changeTab} />
		</View>
	);
}
