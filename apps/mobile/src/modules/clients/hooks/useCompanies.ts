import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { createCompany, searchCompanies } from '../services/companyService';
import type {
	Company,
	CompanyCreateInput,
	CompanySearchParams,
} from '../types/company';

const DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 100;
const EMPTY_FILTERS: CompanySearchParams = {};

export function useCompanies(filters: CompanySearchParams = EMPTY_FILTERS) {
	// Serializa os filtros para uma chave estável (string): o chamador costuma
	// passar um objeto literal novo a cada render, o que quebraria a igualdade
	// de referência usada pelo debounce e causaria um loop de refetch.
	const filtersKey = JSON.stringify(filters);
	const debouncedFiltersKey = useDebouncedValue(filtersKey, DEBOUNCE_MS);

	const [companies, setCompanies] = useState<Company[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await searchCompanies({
				page_size: DEFAULT_PAGE_SIZE,
				...(JSON.parse(debouncedFiltersKey) as CompanySearchParams),
			});
			setCompanies(result.items);
			setTotal(result.total);
		} catch {
			setError('Não foi possível carregar os clientes. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, [debouncedFiltersKey]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const create = useCallback(async (data: CompanyCreateInput) => {
		const company = await createCompany(data);
		setCompanies((current) => [company, ...current]);
		setTotal((current) => current + 1);
		return company;
	}, []);

	const removeMany = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setCompanies((current) =>
			current.filter((company) => !idSet.has(company.id)),
		);
		setTotal((current) => Math.max(0, current - idSet.size));
	}, []);

	return { companies, total, isLoading, error, refresh, create, removeMany };
}
