import {
	apiDeleteAuth,
	apiGetAuth,
	apiPatchAuth,
	apiPostAuth,
} from '../../../shared/services/apiClient';
import type {
	Company,
	CompanyCreateInput,
	CompanyUpdateInput,
} from '../types/company';

const CLIENTS_PATH = '/api/clients';

export function listCompanies(): Promise<Company[]> {
	return apiGetAuth<Company[]>(CLIENTS_PATH);
}

export function createCompany(data: CompanyCreateInput): Promise<Company> {
	return apiPostAuth<Company, CompanyCreateInput>(CLIENTS_PATH, data);
}

export function getCompany(id: string): Promise<Company> {
	return apiGetAuth<Company>(`${CLIENTS_PATH}/${id}`);
}

export function updateCompany(
	id: string,
	data: Partial<CompanyUpdateInput>,
): Promise<Company> {
	return apiPatchAuth<Company, Partial<CompanyUpdateInput>>(
		`${CLIENTS_PATH}/${id}`,
		data,
	);
}

export function deleteCompany(id: string): Promise<void> {
	return apiDeleteAuth(`${CLIENTS_PATH}/${id}`);
}
