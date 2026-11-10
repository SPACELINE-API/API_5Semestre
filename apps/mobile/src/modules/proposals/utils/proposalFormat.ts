import type { Proposal, ProposalStatus } from '../types/proposal';

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
	draft: 'Em preparação',
	pending: 'Aguardando aprovação',
	approved: 'Aprovada',
	reproved: 'Reprovada',
	cancelled: 'Cancelada',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
	draft: '#1D4ED8',
	pending: '#D97706',
	approved: '#15803D',
	reproved: '#B91C1C',
	cancelled: '#4B5563',
};

export function formatProposalValue(value: number | string) {
	return new Intl.NumberFormat('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	}).format(Number(value) || 0);
}

export function formatProposalDate(value: string) {
	return new Date(value).toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
}

export function proposalCustomerLabel(proposal: Proposal) {
	const customer = proposal.customer_name?.trim();
	const enterprise = proposal.enterprise?.trim();
	if (customer && enterprise) return `${customer} (${enterprise})`;
	return customer || enterprise || 'Cliente não informado';
}
