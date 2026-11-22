import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../../../shared/components/TabBar';
import { usePermission } from '../../auth/hooks/usePermission';

export type TasksTab = 'atribuidas' | 'minhas';

// MESMO PADRAO DE CONFIGURACOES: CADA ABA E UMA ROTA
export function TasksHeader({ active }: { active: TasksTab }) {
	const router = useRouter();
	const canAssign = usePermission('assignments.write');

	const tabs: { key: TasksTab; label: string }[] = [
		...(canAssign
			? [{ key: 'atribuidas' as const, label: 'Atribuídas por mim' }]
			: []),
		{ key: 'minhas', label: 'Atribuídas a mim' },
	];

	function changeTab(tab: TasksTab) {
		if (tab === active) return;
		router.replace(`/tarefas/${tab}` as never);
	}

	return (
		<View className="mb-6 gap-4">
			<View>
				<Text className="font-inter font-bold text-foreground text-2xl">
					Tarefas
				</Text>
				<Text className="mt-2 font-inter text-foreground-muted text-sm">
					{canAssign
						? 'Crie e acompanhe as tarefas que você atribuiu e execute as que foram atribuídas a você.'
						: 'Execute as tarefas que foram atribuídas a você.'}
				</Text>
			</View>
			<TabBar tabs={tabs} activeTab={active} onTabChange={changeTab} />
		</View>
	);
}
