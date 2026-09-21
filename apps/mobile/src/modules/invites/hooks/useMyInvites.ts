import { useCallback, useEffect, useState } from 'react';
import { listMyInvites } from '../services/inviteService';
import type { ServiceOrderItemInvite } from '../types/invite';

export function useMyInvites() {
	const [invites, setInvites] = useState<ServiceOrderItemInvite[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const data = await listMyInvites();
			setInvites(data);
		} catch {
			setError('Não foi possível carregar os convites. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { invites, isLoading, error, refresh };
}
