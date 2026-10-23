import type { Proposal, ProposalStatus } from '../types/proposal';

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
	pending: 'Pendente',
	approved: 'Aprovada',
	reproved: 'Reprovada',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
	pending: '#D97706',
	approved: '#15803D',
	reproved: '#B91C1C',
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
	return proposal.customer_name?.trim() || proposal.enterprise?.trim() || 'Cliente não informado';
}
