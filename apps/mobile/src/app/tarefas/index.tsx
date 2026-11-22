import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { usePermission } from '../../modules/auth/hooks/usePermission';

export default function TasksScreen() {
	const canAssignByMe = usePermission('tasks.write');
	const canViewAssignedToMe = usePermission('tasks.assigned_to_me.read');

	if (!canAssignByMe && !canViewAssignedToMe) {
		return (
			<View className="flex-1 items-center justify-center bg-surface px-6">
				<Text className="font-inter text-center text-sm text-foreground-muted">
					Nenhuma lista de tarefas foi liberada para este perfil.
				</Text>
			</View>
		);
	}

	return (
		<Redirect
			href={
				(canAssignByMe ? '/tarefas/atribuidas' : '/tarefas/minhas') as never
			}
		/>
	);
}
