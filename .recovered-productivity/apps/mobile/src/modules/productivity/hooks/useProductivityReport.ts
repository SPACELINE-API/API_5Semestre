import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getProductivityReport } from '../services/productivityService';
import type {
	ProductivityFilters,
	ProductivityReport,
} from '../types/productivity';
import { isValidPeriod } from '../utils/filters';

export function productivityErrorMessage(cause: unknown): string {
	if (cause instanceof ApiError && cause.status === 403) {
		return 'Você não tem permissão para consultar este relatório.';
	}
	if (cause instanceof ApiError && cause.status === 422) {
		return 'Período inválido. Confira as datas selecionadas.';
	}
	return 'Não foi possível carregar o relatório. Tente novamente.';
}

export function useProductivityReport(filters: ProductivityFilters) {
	const [report, setReport] = useState<ProductivityReport | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestId = useRef(0);

	const { dateFrom, dateTo, translatorId, serviceOrderId } = filters;

	const refresh = useCallback(async () => {
		const current = ++requestId.current;
		const params = { dateFrom, dateTo, translatorId, serviceOrderId };

		if (!isValidPeriod(params)) {
			setReport(null);
			setIsLoading(false);
			setError('A data inicial não pode ser posterior à data final.');
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const data = await getProductivityReport(params);
			if (current === requestId.current) setReport(data);
		} catch (cause) {
			if (current === requestId.current) {
				setReport(null);
				setError(productivityErrorMessage(cause));
			}
		} finally {
			if (current === requestId.current) setIsLoading(false);
		}
	}, [dateFrom, dateTo, translatorId, serviceOrderId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { report, isLoading, error, refresh };
}
