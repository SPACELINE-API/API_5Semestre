import { useCallback, useEffect, useState } from 'react';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { searchTranslators } from '../services/translatorService';
import type { Translator, TranslatorSearchParams } from '../types/translator';

const DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 100;
const EMPTY_FILTERS: TranslatorSearchParams = {};

export function useTranslators(
	filters: TranslatorSearchParams = EMPTY_FILTERS,
) {
	// Serializa os filtros para uma chave estável (string): o chamador costuma
	// passar um objeto literal novo a cada render, o que quebraria a igualdade
	// de referência usada pelo debounce e causaria um loop de refetch.
	const filtersKey = JSON.stringify(filters);
	const debouncedFiltersKey = useDebouncedValue(filtersKey, DEBOUNCE_MS);

	const [translators, setTranslators] = useState<Translator[]>([]);
	const [total, setTotal] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await searchTranslators({
				page_size: DEFAULT_PAGE_SIZE,
				...(JSON.parse(debouncedFiltersKey) as TranslatorSearchParams),
			});
			setTranslators(result.items);
			setTotal(result.total);
		} catch {
			setError('Não foi possível carregar os tradutores. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, [debouncedFiltersKey]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { translators, total, isLoading, error, refresh };
}
