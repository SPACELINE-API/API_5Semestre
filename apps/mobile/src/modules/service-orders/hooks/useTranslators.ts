import { useCallback, useEffect, useState } from 'react';
import { listTranslators } from '../services/translatorService';
import type { Translator } from '../types/serviceOrder';

export function useTranslators() {
	const [translators, setTranslators] = useState<Translator[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await listTranslators();
			setTranslators(data);
		} catch {
			setError('Não foi possível carregar os tradutores.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { translators, isLoading, error, refresh };
}
