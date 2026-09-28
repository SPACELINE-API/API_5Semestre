import {
	apiGet,
	apiGetAuth,
	apiPostAuth,
} from '../../../shared/services/apiClient';
import type {
	ServiceOrderItemDetails,
	ServiceOrderItemInvite,
} from '../types/invite';

const SERVICE_ORDERS_PATH = '/api/service-orders';

type ServiceOrderWithItems = {
	items: ServiceOrderItemDetails[];
};

export function listMyInvites(): Promise<ServiceOrderItemInvite[]> {
	return apiGetAuth<ServiceOrderItemInvite[]>(
		`${SERVICE_ORDERS_PATH}/invites/me`,
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

export async function findServiceOrderItem(
	itemId: string,
): Promise<ServiceOrderItemDetails | null> {
	const serviceOrders =
		await apiGet<ServiceOrderWithItems[]>(SERVICE_ORDERS_PATH);

	for (const serviceOrder of serviceOrders) {
		const item = serviceOrder.items.find((current) => current.id === itemId);
		if (item) return item;
	}

	return null;
}
