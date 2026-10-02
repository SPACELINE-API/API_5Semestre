import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
	apiUrl,
} from '../../../shared/services/apiClient';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
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

export function deleteServiceOrderFile(
	serviceOrderId: string,
	fileId: string,
): Promise<void> {
	return apiDelete(`${SERVICE_ORDERS_PATH}/${serviceOrderId}/files/${fileId}`);
}

export function deleteServiceOrderItemFile(
	serviceOrderId: string,
	itemId: string,
): Promise<void> {
	return apiDelete(
		`${SERVICE_ORDERS_PATH}/${serviceOrderId}/items/${itemId}/file`,
	);
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
	return uploadFileMultipart<ServiceOrderFile>(
		`${apiUrl}${SERVICE_ORDERS_PATH}/${serviceOrderId}/files`,
		file,
		{ direction },
	);
}

export async function createServiceOrderItem(
	serviceOrderId: string,
	data: CreateServiceOrderItemInput,
	file: UploadableFile | null,
): Promise<ServiceOrderItem> {
	const formData = new FormData();
	const fields: Record<string, string> = {
		source_language: data.source_language,
		target_language: data.target_language,
	};
	if (data.document_type) fields.document_type = data.document_type;
	if (data.word_count != null) {
		fields.word_count = String(data.word_count);
	}
	if (data.price != null) fields.price = String(data.price);
	if (data.deadline) fields.deadline = data.deadline;
	if (file) {
		return uploadFileMultipart<ServiceOrderItem>(
			`${apiUrl}${SERVICE_ORDERS_PATH}/${serviceOrderId}/items`,
			file,
			fields,
		);
	}

	Object.entries(fields).forEach(([name, value]) =>
		formData.append(name, value),
	);

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
	const fields: Record<string, string> = {
		source_language: data.source_language,
		target_language: data.target_language,
	};
	if (data.document_type) fields.document_type = data.document_type;
	if (data.word_count != null) {
		fields.word_count = String(data.word_count);
	}
	if (data.price != null) fields.price = String(data.price);
	if (data.deadline) fields.deadline = data.deadline;
	if (file) {
		return uploadFileMultipart<ServiceOrderItem>(
			`${apiUrl}${SERVICE_ORDERS_PATH}/items/${itemId}`,
			file,
			fields,
			'PATCH',
		);
	}

	Object.entries(fields).forEach(([name, value]) =>
		formData.append(name, value),
	);

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
