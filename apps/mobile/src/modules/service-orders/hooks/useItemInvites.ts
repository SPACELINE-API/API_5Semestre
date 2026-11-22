import { useEffect, useState } from 'react';
import { listItemInvites } from '../services/serviceOrderService';
import type { ServiceOrderItemInvite } from '../types/serviceOrder';
import { usePermission } from '../../auth/hooks/usePermission';

export function useItemInvites(itemId: string, refreshToken: number) {
	const canManageAssignments = usePermission('assignments.manage');
	const [invites, setInvites] = useState<ServiceOrderItemInvite[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		if (!itemId || !canManageAssignments) {
			setInvites([]);
			setIsLoading(false);
			return () => {
				cancelled = true;
			};
		}

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
	}, [itemId, refreshToken, canManageAssignments]);

	return { invites, isLoading };
}
