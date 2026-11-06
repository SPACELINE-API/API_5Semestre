import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiGetAuth, apiPostAuth } from '../../../shared/services/apiClient';
import { resolveNativeResourceUrl } from '../../../shared/utils/nativeResourceUrl';
import type {
	CompanyReportRequest,
	CompanyReportFileResponse,
	ReportCompanyOption,
} from '../types/report';
import type { ProposalPage, ProposalFilters } from '../types/proposal';

const PROPOSALS_PATH = '/api/quotes/proposals';
const PAGE_SIZE = 10;
const PROPOSAL_COMPANIES_PATH = '/api/quotes/proposals/companies';
const PROPOSAL_REPORT_PATH = '/api/quotes/proposals/reports';
const REPORT_COMPANIES_PATH = '/api/clients';

export function listProposalCompanies(): Promise<string[]> {
	return apiGetAuth<string[]>(PROPOSAL_COMPANIES_PATH);
}

export async function listReportCompanies(): Promise<ReportCompanyOption[]> {
	const companies = await apiGetAuth<Array<{ id: string; trade_name: string }>>(
		REPORT_COMPANIES_PATH,
	);
	return companies.map(({ id, trade_name }) => ({ id, trade_name }));
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

export async function downloadCompanyReport(
	request: CompanyReportRequest,
): Promise<void> {
	const report = await apiPostAuth<CompanyReportFileResponse, typeof request>(
		PROPOSAL_REPORT_PATH,
		request,
	);
	const reportUrl = resolveNativeResourceUrl(
		report.url,
		Constants.expoConfig?.hostUri,
		Platform.OS,
	);
	if (Platform.OS === 'web') {
		const frame = document.createElement('iframe');
		frame.style.display = 'none';
		frame.src = reportUrl;
		document.body.appendChild(frame);
		window.setTimeout(() => frame.remove(), 60_000);
		return;
	}
	await Linking.openURL(reportUrl);
}

export { PAGE_SIZE as PROPOSAL_PAGE_SIZE };
