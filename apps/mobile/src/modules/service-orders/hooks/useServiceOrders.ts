import { useCallback, useEffect, useState } from 'react';
import {
	generateServiceOrderFromQuote,
	createManualServiceOrder,
	listServiceOrders,
} from '../services/serviceOrderService';
import type {
	GenerateServiceOrderInput,
	ManualServiceOrderInput,
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

	const create = useCallback(
		async (data: GenerateServiceOrderInput | ManualServiceOrderInput) => {
			const serviceOrder =
				'quote_id' in data
					? await generateServiceOrderFromQuote(data)
					: await createManualServiceOrder(data);
			setServiceOrders((current) => [serviceOrder, ...current]);
			return serviceOrder;
		},
		[],
	);

	const removeMany = useCallback((ids: string[]) => {
		const idSet = new Set(ids);
		setServiceOrders((current) =>
			current.filter((serviceOrder) => !idSet.has(serviceOrder.id)),
		);
	}, []);

	return { serviceOrders, isLoading, error, refresh, create, removeMany };
}
