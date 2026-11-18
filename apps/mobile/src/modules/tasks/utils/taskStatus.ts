import type { Task, TaskStatus } from '../types/task';

type StatusPresentation = {
	label: string;
	badge: { background: string; text: string; dot: string };
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
	'pending',
	'in_progress',
	'in_review',
	'rejected',
	'completed',
];

export const TASK_STATUS_PRESENTATION: Record<TaskStatus, StatusPresentation> =
	{
		pending: {
			label: 'Pendente',
			badge: {
				background: 'bg-gray-100',
				text: 'text-gray-700',
				dot: 'bg-gray-400',
			},
		},
		in_progress: {
			label: 'Em andamento',
			badge: {
				background: 'bg-blue-50',
				text: 'text-blue-700',
				dot: 'bg-blue-500',
			},
		},
		in_review: {
			label: 'Em análise',
			badge: {
				background: 'bg-amber-50',
				text: 'text-amber-800',
				dot: 'bg-amber-500',
			},
		},
		completed: {
			label: 'Concluído',
			badge: {
				background: 'bg-green-50',
				text: 'text-green-800',
				dot: 'bg-green-500',
			},
		},
		rejected: {
			label: 'Reprovado',
			badge: {
				background: 'bg-red-50',
				text: 'text-red-800',
				dot: 'bg-red-500',
			},
		},
	};

export type EmployeeActions = {
	canStart: boolean;
	canEditExecution: boolean;
	canSubmit: boolean;
	canResume: boolean;
};

// ESPELHA AS TRANSICOES DO BACKEND PARA NAO OFERECER ACOES INCOMPATIVEIS COM O STATUS
export function employeeActionsFor(
	task: Pick<Task, 'status' | 'execution_description'>,
): EmployeeActions {
	const inProgress = task.status === 'in_progress';
	return {
		canStart: task.status === 'pending',
		canEditExecution: inProgress,
		// O ENVIO PARA ANALISE EXIGE A DESCRICAO DA EXECUCAO JA SALVA
		canSubmit: inProgress && Boolean(task.execution_description?.trim()),
		canResume: task.status === 'rejected',
	};
}

export function canReview(task: Pick<Task, 'status'>): boolean {
	return task.status === 'in_review';
}

// O MOTIVO DA ULTIMA REPROVACAO CONTINUA VISIVEL ATE A TAREFA SER CONCLUIDA
export function showsRejectionReason(
	task: Pick<Task, 'status' | 'rejection_reason'>,
): boolean {
	return Boolean(task.rejection_reason) && task.status !== 'completed';
}

export function countByStatus(tasks: Pick<Task, 'status'>[]) {
	const counts = Object.fromEntries(
		TASK_STATUS_ORDER.map((status) => [status, 0]),
	) as Record<TaskStatus, number>;
	for (const task of tasks) counts[task.status] += 1;
	return counts;
}
