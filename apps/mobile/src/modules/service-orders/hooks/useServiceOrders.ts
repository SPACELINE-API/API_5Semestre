import { useCallback, useEffect, useState } from 'react';
import {
	generateServiceOrderFromQuote,
	listServiceOrders,
} from '../services/serviceOrderService';
import type {
	GenerateServiceOrderInput,
	ServiceOrder,
} from '../types/serviceOrder';

export function useServiceOrders() {
	const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await listServiceOrders();
			setServiceOrders(data);
		} catch {
			setError(
				'Não foi possível carregar as ordens de serviço. Tente novamente.',
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const create = useCallback(async (data: GenerateServiceOrderInput) => {
		const serviceOrder = await generateServiceOrderFromQuote(data);
		setServiceOrders((current) => [serviceOrder, ...current]);
		return serviceOrder;
	}, []);

	return { serviceOrders, isLoading, error, refresh, create };
}
