import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
} from '../../../shared/services/apiClient';
import type {
	Company,
	CompanyCreateInput,
	CompanyPage,
	CompanySearchParams,
	CompanyUpdateInput,
} from '../types/company';

const CLIENTS_PATH = '/api/clients';

export function searchCompanies(
	params: CompanySearchParams = {},
): Promise<CompanyPage> {
	const query = new URLSearchParams();

	if (params.name) query.set('name', params.name);
	if (params.status !== undefined) query.set('status', String(params.status));
	if (params.product) query.set('product', params.product);
	if (params.page !== undefined) query.set('page', String(params.page));
	if (params.page_size !== undefined) {
		query.set('page_size', String(params.page_size));
	}

	const queryString = query.toString();
	return apiGet<CompanyPage>(
		queryString ? `${CLIENTS_PATH}?${queryString}` : CLIENTS_PATH,
	);
}

export function createCompany(data: CompanyCreateInput): Promise<Company> {
	return apiPost<Company, CompanyCreateInput>(CLIENTS_PATH, data);
}

export function getCompany(id: string): Promise<Company> {
	return apiGet<Company>(`${CLIENTS_PATH}/${id}`);
}

export function updateCompany(
	id: string,
	data: Partial<CompanyUpdateInput>,
): Promise<Company> {
	return apiPatch<Company, Partial<CompanyUpdateInput>>(
		`${CLIENTS_PATH}/${id}`,
		data,
	);
}

export function deleteCompany(id: string): Promise<void> {
	return apiDelete(`${CLIENTS_PATH}/${id}`);
}
