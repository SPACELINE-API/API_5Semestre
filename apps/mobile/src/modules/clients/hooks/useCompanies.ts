import { useCallback, useEffect, useState } from 'react';
import { createCompany, listCompanies } from '../services/companyService';
import type { Company, CompanyCreateInput } from '../types/company';

export function useCompanies() {
	const [companies, setCompanies] = useState<Company[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await listCompanies();
			setCompanies(data);
		} catch {
			setError('Não foi possível carregar os clientes. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const create = useCallback(async (data: CompanyCreateInput) => {
		const company = await createCompany(data);
		setCompanies((current) => [company, ...current]);
		return company;
	}, []);

	const removeMany = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setCompanies((current) =>
			current.filter((company) => !idSet.has(company.id)),
		);
	}, []);

	return { companies, isLoading, error, refresh, create, removeMany };
}
