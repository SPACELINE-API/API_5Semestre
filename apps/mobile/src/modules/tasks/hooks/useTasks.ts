import { useCallback, useEffect, useState } from 'react';
import type { Task } from '../types/task';

export function useTasks(loader: () => Promise<Task[]>) {
	const [tasks, setTasks] = useState<Task[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			setTasks(await loader());
		} catch {
			setError('Não foi possível carregar as tarefas. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, [loader]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	// ATUALIZA A TAREFA NA LISTA COM A RESPOSTA DA API, SEM RECARREGAR TUDO
	const replaceTask = useCallback((updated: Task) => {
		setTasks((current) =>
			current.map((task) => (task.id === updated.id ? updated : task)),
		);
	}, []);

	return { tasks, isLoading, error, refresh, replaceTask };
}
