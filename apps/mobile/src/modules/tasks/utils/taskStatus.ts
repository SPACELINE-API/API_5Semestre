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
				background: 'bg-surface-muted',
				text: 'text-foreground-secondary',
				dot: 'bg-foreground-subtle',
			},
		},
		in_progress: {
			label: 'Em andamento',
			badge: {
				background: 'bg-primary-soft',
				text: 'text-primary-text',
				dot: 'bg-primary',
			},
		},
		in_review: {
			label: 'Em análise',
			badge: {
				background: 'bg-warning-soft',
				text: 'text-warning-text',
				dot: 'bg-warning',
			},
		},
		completed: {
			label: 'Concluído',
			badge: {
				background: 'bg-success-soft',
				text: 'text-success-text',
				dot: 'bg-success',
			},
		},
		rejected: {
			label: 'Reprovado',
			badge: {
				background: 'bg-danger-soft',
				text: 'text-danger-text',
				dot: 'bg-danger',
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
