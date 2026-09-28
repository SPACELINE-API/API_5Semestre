import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getServiceOrder } from '../services/serviceOrderService';
import type { ServiceOrder } from '../types/serviceOrder';

export function useServiceOrder(id: string) {
	const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await getServiceOrder(id);
			setServiceOrder(data);
		} catch {
			setError('Não foi possível carregar os dados da ordem de serviço.');
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => {
		if (Platform.OS !== 'web') return;

		function handleFocus() {
			refresh();
		}

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, [refresh]);

	return { serviceOrder, isLoading, error, refresh, setServiceOrder };
}
