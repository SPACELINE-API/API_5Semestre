import { useCallback, useEffect, useState } from 'react';
import { getCompany } from '../services/companyService';
import type { Company } from '../types/company';

export function useCompany(id: string) {
	const [company, setCompany] = useState<Company | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await getCompany(id);
			setCompany(data);
		} catch {
			setError('Não foi possível carregar os dados do cliente.');
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { company, isLoading, error, refresh, setCompany };
}
