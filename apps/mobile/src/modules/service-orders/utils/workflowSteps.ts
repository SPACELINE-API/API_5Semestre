import type { ServiceOrderItemStatus } from '../types/serviceOrder';

export type WorkflowStep = {
	status: ServiceOrderItemStatus;
	title: string;
	doneLabel: string;
	upcomingLabel: string;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
	{
		status: 'pendente',
		title: 'Pendente',
		doneLabel: 'Concluída',
		upcomingLabel: 'Aguardando',
	},
	{
		status: 'em_andamento',
		title: 'Em andamento',
		doneLabel: 'Concluída',
		upcomingLabel: 'Aguardando',
	},
	{
		status: 'em_analise',
		title: 'Em análise',
		doneLabel: 'Concluída',
		upcomingLabel: 'Aguardando',
	},
	{
		status: 'concluida',
		title: 'Concluída',
		doneLabel: 'Concluída',
		upcomingLabel: 'Aguardando',
	},
];

export const WORKFLOW_CURRENT_BAND_COLOR: Record<
	ServiceOrderItemStatus,
	string
> = {
	pendente: '#6B7280',
	em_andamento: '#F97316',
	em_analise: '#A855F7',
	concluida: '#16A34A',
};

export const WORKFLOW_CURRENT_BAND_CLASS: Record<
	ServiceOrderItemStatus,
	string
> = {
	pendente: 'bg-gray-500',
	em_andamento: 'bg-orange-500',
	em_analise: 'bg-purple-500',
	concluida: 'bg-green-600',
};

export function getWorkflowCurrentIndex(
	status: ServiceOrderItemStatus,
): number {
	return WORKFLOW_STEPS.findIndex((step) => step.status === status);
}
