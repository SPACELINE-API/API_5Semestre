import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
} from '../../../shared/services/apiClient';
import type {
	Company,
	CompanyCreateInput,
	CompanyUpdateInput,
} from '../types/company';

const CLIENTS_PATH = '/api/clients';

export function listCompanies(): Promise<Company[]> {
	return apiGet<Company[]>(CLIENTS_PATH);
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
