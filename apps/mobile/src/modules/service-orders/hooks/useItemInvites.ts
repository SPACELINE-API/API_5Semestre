import { useEffect, useState } from 'react';
import { listItemInvites } from '../services/serviceOrderService';
import type { ServiceOrderItemInvite } from '../types/serviceOrder';

export function useItemInvites(itemId: string, refreshToken: number) {
	const [invites, setInvites] = useState<ServiceOrderItemInvite[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setIsLoading(true);

		listItemInvites(itemId)
			.then((data) => {
				if (!cancelled) setInvites(data);
			})
			.catch(() => {
				if (!cancelled) setInvites([]);
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [itemId, refreshToken]);

	return { invites, isLoading };
}
