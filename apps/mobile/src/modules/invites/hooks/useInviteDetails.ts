import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getMyInvite } from '../services/inviteService';
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
			const { item: details, ...inviteData } = await getMyInvite(inviteId);
			setInvite(inviteData);
			setItem(details);
		} catch (cause) {
			setInvite(null);
			setItem(null);
			setError(
				cause instanceof ApiError &&
					(cause.status === 404 || cause.status === 403)
					? 'Convite não encontrado.'
					: 'Não foi possível carregar os dados do convite.',
			);
		} finally {
			setIsLoading(false);
		}
	}, [inviteId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { invite, item, isLoading, error, refresh, setInvite };
}
