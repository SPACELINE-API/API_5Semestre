import { apiGetAuth } from '../../../shared/services/apiClient';
import type { ProposalPage, ProposalFilters } from '../types/proposal';

const PROPOSALS_PATH = '/api/quotes/proposals';
const PAGE_SIZE = 10;
const PROPOSAL_COMPANIES_PATH = '/api/quotes/proposals/companies';

export function listProposalCompanies(): Promise<string[]> {
	return apiGetAuth<string[]>(PROPOSAL_COMPANIES_PATH);
}

export function listProposals(
	filters: ProposalFilters,
): Promise<ProposalPage> {
	const query = new URLSearchParams({
		page: String(filters.page),
		page_size: String(PAGE_SIZE),
		order_by: filters.orderBy,
		order_dir: filters.orderDir,
	});

	if (filters.startDate) query.set('start_date', filters.startDate);
	if (filters.endDate) query.set('end_date', filters.endDate);
	if (filters.status !== 'all' && filters.status) {
		query.set('status', filters.status);
	}
	if (filters.enterprise) query.set('enterprise', filters.enterprise);

	return apiGetAuth<ProposalPage>(`${PROPOSALS_PATH}?${query.toString()}`);
}

export { PAGE_SIZE as PROPOSAL_PAGE_SIZE };
