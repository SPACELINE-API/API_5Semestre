import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPostAuth,
} from '../../../shared/services/apiClient';

const ADDITIONAL_SERVICES_PATH = '/api/quotes/additional-services';

export type AdditionalServiceStatus = 'pending' | 'approved' | 'reproved';

export type AdditionalService = {
	id: string;
	quote_id: string;
	created_by: string | null;
	description: string;
	price: string;
	status: AdditionalServiceStatus;
	created_at: string;
	updated_at: string;
};

export type AdditionalServiceFormData = {
	description: string;
	price: number;
};

export type AdditionalServiceCreateInput = AdditionalServiceFormData & {
	quote_id: string;
};

export type AdditionalServiceUpdateInput = Partial<AdditionalServiceFormData>;

export function listAdditionalServicesByQuote(
	quoteId: string,
): Promise<AdditionalService[]> {
	return apiGet<AdditionalService[]>(
		`${ADDITIONAL_SERVICES_PATH}?quote_id=${encodeURIComponent(quoteId)}`,
	);
}

export function getAdditionalService(
	serviceId: string,
): Promise<AdditionalService> {
	return apiGet<AdditionalService>(
		`${ADDITIONAL_SERVICES_PATH}/${encodeURIComponent(serviceId)}`,
	);
}

export function createAdditionalService(
	data: AdditionalServiceCreateInput,
): Promise<AdditionalService> {
	return apiPostAuth<AdditionalService, AdditionalServiceCreateInput>(
		ADDITIONAL_SERVICES_PATH,
		data,
	);
}

export function updateAdditionalService(
	serviceId: string,
	data: AdditionalServiceUpdateInput,
): Promise<AdditionalService> {
	return apiPatch<AdditionalService, AdditionalServiceUpdateInput>(
		`${ADDITIONAL_SERVICES_PATH}/${encodeURIComponent(serviceId)}`,
		data,
	);
}

export function updateAdditionalServiceStatus(
	serviceId: string,
	status: AdditionalServiceStatus,
): Promise<AdditionalService> {
	return apiPatch<AdditionalService, { status: AdditionalServiceStatus }>(
		`${ADDITIONAL_SERVICES_PATH}/${encodeURIComponent(serviceId)}/status`,
		{ status },
	);
}

export function deleteAdditionalService(serviceId: string): Promise<void> {
	return apiDelete(
		`${ADDITIONAL_SERVICES_PATH}/${encodeURIComponent(serviceId)}`,
	);
}
