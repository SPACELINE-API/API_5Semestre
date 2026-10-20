import { useEffect, useState } from 'react';
import { listAdditionalServicesByQuote } from '../../quotes/services/additionalService';
import type { AdditionalService } from '../../quotes/services/additionalService';

export function useAdditionalServices(quoteId: string, refreshToken: number) {
	const [services, setServices] = useState<AdditionalService[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		if (!quoteId) {
			setServices([]);
			setIsLoading(false);
			return () => {
				cancelled = true;
			};
		}

		setIsLoading(true);
		setError(null);

		listAdditionalServicesByQuote(quoteId)
			.then((data) => {
				if (!cancelled) setServices(data);
			})
			.catch(() => {
				if (!cancelled)
					setError('Não foi possível carregar os serviços adicionais.');
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [quoteId, refreshToken]);

	return { services, isLoading, error };
}
