import { useCallback, useEffect, useState } from 'react';
import { findServiceOrderItem, listMyInvites } from '../services/inviteService';
import type {
	ServiceOrderItemDetails,
	ServiceOrderItemInvite,
} from '../types/invite';

export function useInviteDetails(inviteId: string) {
	const [invite, setInvite] = useState<ServiceOrderItemInvite | null>(null);
	const [item, setItem] = useState<ServiceOrderItemDetails | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const invites = await listMyInvites();
			const found = invites.find((current) => current.id === inviteId);

			if (!found) {
				setError('Convite não encontrado.');
				setInvite(null);
				setItem(null);
				return;
			}

			setInvite(found);

			const itemDetails = await findServiceOrderItem(
				found.service_order_item_id,
			);
			setItem(itemDetails);
		} catch {
			setError('Não foi possível carregar os dados do convite.');
		} finally {
			setIsLoading(false);
		}
	}, [inviteId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { invite, item, isLoading, error, refresh, setInvite };
}
