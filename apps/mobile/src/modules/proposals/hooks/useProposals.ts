import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { listProposals } from '../services/proposalService';
import type { ProposalFilters, ProposalPage } from '../types/proposal';

function errorMessage(cause: unknown) {
	if (cause instanceof ApiError && cause.status === 403) {
		return 'Você não tem permissão para consultar propostas.';
	}
	if (cause instanceof ApiError && cause.status === 422) {
		return 'Não foi possível aplicar os filtros informados. Confira o período e a ordenação.';
	}
	return 'Não foi possível carregar as propostas. Tente novamente.';
}

export function useProposals(filters: ProposalFilters) {
	const [result, setResult] = useState<ProposalPage | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestId = useRef(0);
	const { startDate, endDate, status, orderBy, orderDir, page } = filters;

	const refresh = useCallback(async () => {
		const current = ++requestId.current;
		if (startDate && endDate && startDate > endDate) {
			setResult(null);
			setIsLoading(false);
			setError('A data inicial não pode ser posterior à data final.');
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			const data = await listProposals({
				startDate,
				endDate,
				status,
				orderBy,
				orderDir,
				page,
			});
			if (current === requestId.current) setResult(data);
		} catch (cause) {
			if (current === requestId.current) {
				setResult(null);
				setError(errorMessage(cause));
			}
		} finally {
			if (current === requestId.current) setIsLoading(false);
		}
	}, [startDate, endDate, status, orderBy, orderDir, page]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { result, isLoading, error, refresh };
}
