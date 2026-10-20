import { apiGetAuth, apiPostAuth } from '../../../shared/services/apiClient';
import type {
	MyInvite,
	MyInviteDetails,
	ServiceOrderItemInvite,
} from '../types/invite';

const SERVICE_ORDERS_PATH = '/api/service-orders';

export function listMyInvites(): Promise<MyInvite[]> {
	return apiGetAuth<MyInvite[]>(`${SERVICE_ORDERS_PATH}/invites/me`);
}

export function getMyInvite(inviteId: string): Promise<MyInviteDetails> {
	return apiGetAuth<MyInviteDetails>(
		`${SERVICE_ORDERS_PATH}/invites/${inviteId}`,
	);
}

export function acceptInvite(
	inviteId: string,
): Promise<ServiceOrderItemInvite> {
	return apiPostAuth<ServiceOrderItemInvite, Record<string, never>>(
		`${SERVICE_ORDERS_PATH}/invites/${inviteId}/accept`,
		{},
	);
}

export function declineInvite(
	inviteId: string,
): Promise<ServiceOrderItemInvite> {
	return apiPostAuth<ServiceOrderItemInvite, Record<string, never>>(
		`${SERVICE_ORDERS_PATH}/invites/${inviteId}/decline`,
		{},
	);
}
