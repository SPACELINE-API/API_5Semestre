import { useCallback, useEffect, useState } from 'react';
import { listMyItems } from '../services/translatorItemService';
import type { TranslatorItem } from '../types/item';

export function useMyItems() {
	const [items, setItems] = useState<TranslatorItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			setItems(await listMyItems());
		} catch {
			setError('Não foi possível carregar seus itens. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return { items, isLoading, error, refresh };
}
