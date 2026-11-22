import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { TabBar } from '../../../shared/components/TabBar';
import { usePermission } from '../../auth/hooks/usePermission';

export type TasksTab = 'atribuidas' | 'minhas';

// MESMO PADRAO DE CONFIGURACOES: CADA ABA E UMA ROTA
export function TasksHeader({ active }: { active: TasksTab }) {
	const router = useRouter();
	const canAssignByMe = usePermission('tasks.write');
	const canViewAssignedToMe = usePermission('tasks.assigned_to_me.read');

	const tabs: { key: TasksTab; label: string }[] = [
		...(canAssignByMe
			? [{ key: 'atribuidas' as const, label: 'Atribuídas por mim' }]
			: []),
		...(canViewAssignedToMe
			? [{ key: 'minhas' as const, label: 'Atribuídas a mim' }]
			: []),
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
					{canAssignByMe && canViewAssignedToMe
						? 'Crie e acompanhe as tarefas que você atribuiu e execute as que foram atribuídas a você.'
						: canAssignByMe
							? 'Crie e acompanhe as tarefas que você atribuiu.'
							: canViewAssignedToMe
								? 'Execute as tarefas que foram atribuídas a você.'
								: 'Acesse a área de tarefas.'}
				</Text>
			</View>
			<TabBar tabs={tabs} activeTab={active} onTabChange={changeTab} />
		</View>
	);
}
