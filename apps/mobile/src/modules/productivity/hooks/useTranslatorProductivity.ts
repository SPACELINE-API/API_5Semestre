import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getTranslatorProductivity } from '../services/productivityService';
import type {
	ProductivityFilters,
	TranslatorProductivityDetails,
} from '../types/productivity';
import { productivityErrorMessage } from './useProductivityReport';

export function useTranslatorProductivity(
	translatorId: string,
	filters: ProductivityFilters,
) {
	const [details, setDetails] = useState<TranslatorProductivityDetails | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const requestId = useRef(0);

	const { dateFrom, dateTo, serviceOrderId } = filters;

	const refresh = useCallback(async () => {
		const current = ++requestId.current;
		setIsLoading(true);
		setError(null);

		try {
			const data = await getTranslatorProductivity(translatorId, {
				dateFrom,
				dateTo,
				translatorId: '',
				serviceOrderId,
			});
			if (current === requestId.current) setDetails(data);
		} catch (cause) {
			if (current === requestId.current) {
				setDetails(null);
				setError(
					cause instanceof ApiError && cause.status === 404
						? 'Profissional não encontrado.'
						: productivityErrorMessage(cause),
				);
			}
		} finally {
			if (current === requestId.current) setIsLoading(false);
		}
	}, [translatorId, dateFrom, dateTo, serviceOrderId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { details, isLoading, error, refresh };
}
