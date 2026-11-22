import {
	apiDeleteAuth,
	apiGetAuth,
	apiPatchAuth,
	apiPostAuth,
} from '../../../shared/services/apiClient';
import type { Role } from '../../auth/types/roles';
import type {
	InternalUser,
	InternalUserCreateInput,
	InternalUserUpdateInput,
} from '../types/internalUser';

const PATH = '/api/internal-users';

export function listInternalUsers(): Promise<InternalUser[]> {
	return apiGetAuth<InternalUser[]>(PATH);
}

export async function listAssignableRoles(): Promise<Role[]> {
	return apiGetAuth<Role[]>(`${PATH}/assignable-roles`);
}

export function createInternalUser(
	input: InternalUserCreateInput,
): Promise<InternalUser> {
	return apiPostAuth<InternalUser, InternalUserCreateInput>(PATH, input);
}

export function updateInternalUser(
	id: string,
	input: InternalUserUpdateInput,
): Promise<InternalUser> {
	return apiPatchAuth<InternalUser, InternalUserUpdateInput>(
		`${PATH}/${id}`,
		input,
	);
}

export function deactivateInternalUser(id: string): Promise<InternalUser> {
	return apiPostAuth<InternalUser, Record<string, never>>(
		`${PATH}/${id}/deactivate`,
		{},
	);
}

export function addInternalUserRole(
	id: string,
	roleId: string,
): Promise<InternalUser> {
	return apiPostAuth<InternalUser, { role_id: string }>(`${PATH}/${id}/roles`, {
		role_id: roleId,
	});
}

export function removeInternalUserRole(
	id: string,
	roleId: string,
): Promise<void> {
	return apiDeleteAuth(`${PATH}/${id}/roles/${roleId}`);
}

export function sendPasswordSetupLink(id: string): Promise<InternalUser> {
	return apiPostAuth<InternalUser, Record<string, never>>(
		`${PATH}/${id}/password-setup-link`,
		{},
	);
}

export function resendPasswordSetupLink(id: string): Promise<InternalUser> {
	return apiPostAuth<InternalUser, Record<string, never>>(
		`${PATH}/${id}/password-setup-link/resend`,
		{},
	);
}
