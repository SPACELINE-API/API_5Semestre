import { Platform } from 'react-native';
import {
	apiGetAuth,
	apiPostAuth,
	apiPostAuthBlob,
} from '../../../shared/services/apiClient';
import type {
	CompanyReportRequest,
	CompanyReportResponse,
	ReportFormat,
} from '../types/report';
import type { ProposalPage, ProposalFilters } from '../types/proposal';

const PROPOSALS_PATH = '/api/quotes/proposals';
const PAGE_SIZE = 10;
const PROPOSAL_COMPANIES_PATH = '/api/quotes/proposals/companies';
const PROPOSAL_REPORT_PATH = '/api/quotes/proposals/reports';

export function listProposalCompanies(): Promise<string[]> {
	return apiGetAuth<string[]>(PROPOSAL_COMPANIES_PATH);
}

export function listProposals(filters: ProposalFilters): Promise<ProposalPage> {
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

export function generateCompanyReport(
	request: CompanyReportRequest & { format: 'json' },
): Promise<CompanyReportResponse> {
	return apiPostAuth<CompanyReportResponse, typeof request>(
		PROPOSAL_REPORT_PATH,
		request,
	);
}

export async function downloadCompanyReport(
	request: CompanyReportRequest & { format: Exclude<ReportFormat, 'json'> },
): Promise<boolean> {
	const blob = await apiPostAuthBlob(PROPOSAL_REPORT_PATH, request);
	if (Platform.OS !== 'web') return false;

	const extension = request.format === 'xlsx' ? 'xlsx' : 'csv';
	const mimeType =
		request.format === 'xlsx'
			? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			: 'text/csv;charset=utf-8';
	const downloadBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
	const url = URL.createObjectURL(downloadBlob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `relatorio-propostas.${extension}`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);

	return true;
}

export { PAGE_SIZE as PROPOSAL_PAGE_SIZE };
