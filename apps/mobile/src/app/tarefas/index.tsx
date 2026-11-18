import { Redirect } from 'expo-router';
import { usePermission } from '../../modules/auth/hooks/usePermission';

// ABRE A PRIMEIRA ABA PERMITIDA, COMO EM CONFIGURACOES
export default function TasksScreen() {
	const canAssign = usePermission('assignments.write');
	return (
		<Redirect
			href={(canAssign ? '/tarefas/atribuidas' : '/tarefas/minhas') as never}
		/>
	);
}
