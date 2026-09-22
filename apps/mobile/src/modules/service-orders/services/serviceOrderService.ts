import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
	apiUrl,
} from '../../../shared/services/apiClient';
import { appendFileToFormData } from '../../../shared/utils/formDataFile';
import type { UploadableFile } from '../../../shared/types/file';
import type {
	CreateServiceOrderItemInput,
	GenerateServiceOrderInput,
	ServiceOrder,
	ServiceOrderFile,
	ServiceOrderFileDirection,
	ServiceOrderItem,
	ServiceOrderItemInvite,
	UpdateServiceOrderInput,
	UpdateServiceOrderItemInput,
} from '../types/serviceOrder';

const SERVICE_ORDERS_PATH = '/api/service-orders';

export function listServiceOrders(): Promise<ServiceOrder[]> {
	return apiGet<ServiceOrder[]>(SERVICE_ORDERS_PATH);
}

export function getServiceOrder(id: string): Promise<ServiceOrder> {
	return apiGet<ServiceOrder>(`${SERVICE_ORDERS_PATH}/${id}`);
}

export function deleteServiceOrder(id: string): Promise<void> {
	return apiDelete(`${SERVICE_ORDERS_PATH}/${id}`);
}

export function generateServiceOrderFromQuote(
	data: GenerateServiceOrderInput,
): Promise<ServiceOrder> {
	return apiPost<ServiceOrder, GenerateServiceOrderInput>(
		`${SERVICE_ORDERS_PATH}/generate-from-quote`,
		data,
	);
}

export function updateServiceOrder(
	id: string,
	data: UpdateServiceOrderInput,
): Promise<ServiceOrder> {
	return apiPatch<ServiceOrder, UpdateServiceOrderInput>(
		`${SERVICE_ORDERS_PATH}/${id}`,
		data,
	);
}

export async function uploadServiceOrderFile(
	serviceOrderId: string,
	file: UploadableFile,
	direction: ServiceOrderFileDirection,
): Promise<ServiceOrderFile> {
	const formData = new FormData();
	appendFileToFormData(formData, 'file', file);
	formData.append('direction', direction);

	const response = await fetch(
		`${apiUrl}${SERVICE_ORDERS_PATH}/${serviceOrderId}/files`,
		{ method: 'POST', body: formData },
	);

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload as { detail?: string } | null)?.detail ??
				`Request failed with status ${response.status}`,
		);
	}

	return response.json() as Promise<ServiceOrderFile>;
}

export async function createServiceOrderItem(
	serviceOrderId: string,
	data: CreateServiceOrderItemInput,
	file: UploadableFile | null,
): Promise<ServiceOrderItem> {
	const formData = new FormData();
	formData.append('source_language', data.source_language);
	formData.append('target_language', data.target_language);
	if (data.document_type) formData.append('document_type', data.document_type);
	if (data.word_count != null) {
		formData.append('word_count', String(data.word_count));
	}
	if (data.price != null) formData.append('price', String(data.price));
	if (data.deadline) formData.append('deadline', data.deadline);
	if (file) appendFileToFormData(formData, 'file', file);

	const response = await fetch(
		`${apiUrl}${SERVICE_ORDERS_PATH}/${serviceOrderId}/items`,
		{ method: 'POST', body: formData },
	);

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload as { detail?: string } | null)?.detail ??
				`Request failed with status ${response.status}`,
		);
	}

	return response.json() as Promise<ServiceOrderItem>;
}

export async function updateServiceOrderItem(
	itemId: string,
	data: UpdateServiceOrderItemInput,
	file: UploadableFile | null,
): Promise<ServiceOrderItem> {
	const formData = new FormData();
	formData.append('source_language', data.source_language);
	formData.append('target_language', data.target_language);
	if (data.document_type) formData.append('document_type', data.document_type);
	if (data.word_count != null) {
		formData.append('word_count', String(data.word_count));
	}
	if (data.price != null) formData.append('price', String(data.price));
	if (data.deadline) formData.append('deadline', data.deadline);
	if (file) appendFileToFormData(formData, 'file', file);

	const response = await fetch(
		`${apiUrl}${SERVICE_ORDERS_PATH}/items/${itemId}`,
		{ method: 'PATCH', body: formData },
	);

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			(payload as { detail?: string } | null)?.detail ??
				`Request failed with status ${response.status}`,
		);
	}

	return response.json() as Promise<ServiceOrderItem>;
}

export function sendItemInvites(
	itemId: string,
	translatorIds: string[],
): Promise<ServiceOrderItemInvite[]> {
	return apiPost<ServiceOrderItemInvite[], { translator_ids: string[] }>(
		`${SERVICE_ORDERS_PATH}/items/${itemId}/invites`,
		{ translator_ids: translatorIds },
	);
}

export function listItemInvites(
	itemId: string,
): Promise<ServiceOrderItemInvite[]> {
	return apiGet<ServiceOrderItemInvite[]>(
		`${SERVICE_ORDERS_PATH}/items/${itemId}/invites`,
	);
}
