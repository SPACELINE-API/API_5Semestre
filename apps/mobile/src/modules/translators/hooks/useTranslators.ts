import { useCallback, useEffect, useState } from 'react';
import {
	createTranslator,
	listTranslators,
} from '../services/translatorService';
import type { Translator, TranslatorCreateInput } from '../types/translator';

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
			setError('Não foi possível carregar os tradutores. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const create = useCallback(async (data: TranslatorCreateInput) => {
		const translator = await createTranslator(data);
		setTranslators((prev) => [translator, ...prev]);
		return translator;
	}, []);

	const update = useCallback((updated: Translator) => {
		setTranslators((prev) =>
			prev.map((t) => (t.id === updated.id ? updated : t)),
		);
	}, []);

	const remove = useCallback((id: string) => {
		setTranslators((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return { translators, isLoading, error, refresh, create, update, remove };
}
