import { apiGetAuth, apiPatchAuth } from '../../../shared/services/apiClient';
import type { Permission, Role } from '../types/roles';

const ROLES_PATH = '/api/roles';

export function listRoles(): Promise<Role[]> {
	return apiGetAuth<Role[]>(ROLES_PATH);
}

export function listPermissions(): Promise<Permission[]> {
	return apiGetAuth<Permission[]>(`${ROLES_PATH}/permissions`);
}

export function updateRolePermissions(
	roleId: string,
	permissionIds: string[],
): Promise<Role> {
	return apiPatchAuth<Role, { permission_ids: string[] }>(
		`${ROLES_PATH}/${roleId}`,
		{ permission_ids: permissionIds },
	);
}
