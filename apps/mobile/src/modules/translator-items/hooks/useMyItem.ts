import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getMyItem } from '../services/translatorItemService';
import type { TranslatorItem } from '../types/item';

export function useMyItem(itemId: string) {
	const [item, setItem] = useState<TranslatorItem | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			setItem(await getMyItem(itemId));
		} catch (cause) {
			setItem(null);
			setError(
				cause instanceof ApiError &&
					(cause.status === 404 || cause.status === 403)
					? 'Item não encontrado.'
					: 'Não foi possível carregar o item. Tente novamente.',
			);
		} finally {
			setIsLoading(false);
		}
	}, [itemId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { item, setItem, isLoading, error, refresh };
}
