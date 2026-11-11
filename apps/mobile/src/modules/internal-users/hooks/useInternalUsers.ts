import { useCallback, useEffect, useState } from 'react';
import type { Role } from '../../auth/types/roles';
import {
	listAssignableRoles,
	listInternalUsers,
} from '../services/internalUsersService';
import type { InternalUser } from '../types/internalUser';

export function useInternalUsers() {
	const [people, setPeople] = useState<InternalUser[]>([]);
	const [roles, setRoles] = useState<Role[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const [loadedPeople, loadedRoles] = await Promise.all([
				listInternalUsers(),
				listAssignableRoles(),
			]);
			setPeople(loadedPeople);
			setRoles(loadedRoles);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível carregar as pessoas.',
			);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { people, roles, isLoading, error, reload };
}
