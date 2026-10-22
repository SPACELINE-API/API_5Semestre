import { useCallback, useEffect, useRef, useState } from 'react';
import {
	getAuthorizationContext,
	refreshAuthorizationContext,
} from '../services/auth';
import {
	listPermissions,
	listRoles,
	updateRolePermissions,
} from '../services/roles';
import type { Permission, Role } from '../types/roles';

type Options = {
	onError: (message: string) => void;
};

export function useRolePermissions({ onError }: Options) {
	const [roles, setRoles] = useState<Role[]>([]);
	const [permissions, setPermissions] = useState<Permission[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const confirmedRoles = useRef(new Map<string, Role>());
	const pendingIds = useRef(new Map<string, string[]>());
	const savingRoles = useRef(new Set<string>());
	const onErrorRef = useRef(onError);
	onErrorRef.current = onError;

	useEffect(() => {
		let active = true;

		Promise.all([listRoles(), listPermissions()])
			.then(([loadedRoles, loadedPermissions]) => {
				if (!active) return;
				loadedRoles.forEach((role) =>
					confirmedRoles.current.set(role.id, role),
				);
				setRoles(loadedRoles);
				setPermissions(loadedPermissions);
			})
			.catch((loadError) => {
				if (!active) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Não foi possível carregar as permissões.',
				);
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const replaceRole = useCallback((updated: Role) => {
		setRoles((current) =>
			current.map((role) => (role.id === updated.id ? updated : role)),
		);
	}, []);

	const flush = useCallback(
		async (roleId: string) => {
			if (savingRoles.current.has(roleId)) return;
			savingRoles.current.add(roleId);

			try {
				while (pendingIds.current.has(roleId)) {
					const ids = pendingIds.current.get(roleId) ?? [];
					pendingIds.current.delete(roleId);

					try {
						const updated = await updateRolePermissions(roleId, ids);
						confirmedRoles.current.set(roleId, updated);
						if (!pendingIds.current.has(roleId)) replaceRole(updated);
					} catch (saveError) {
						pendingIds.current.delete(roleId);
						const confirmed = confirmedRoles.current.get(roleId);
						if (confirmed) replaceRole(confirmed);
						onErrorRef.current(
							saveError instanceof Error
								? saveError.message
								: 'Não foi possível atualizar a permissão.',
						);
						return;
					}
				}

				const isOwnRole = getAuthorizationContext()?.roles.some(
					(role) => role.id === roleId,
				);
				if (isOwnRole) {
					refreshAuthorizationContext().catch(() =>
						onErrorRef.current('Não foi possível atualizar suas permissões.'),
					);
				}
			} finally {
				savingRoles.current.delete(roleId);
			}
		},
		[replaceRole],
	);

	const setRolePermissionIds = useCallback(
		(roleId: string, permissionIds: string[]) => {
			const idSet = new Set(permissionIds);
			setRoles((current) =>
				current.map((role) =>
					role.id === roleId
						? {
								...role,
								permissions: permissions.filter(({ id }) => idSet.has(id)),
							}
						: role,
				),
			);
			pendingIds.current.set(roleId, permissionIds);
			void flush(roleId);
		},
		[permissions, flush],
	);

	return {
		roles,
		permissions,
		isLoading,
		error,
		setRolePermissionIds,
	};
}
