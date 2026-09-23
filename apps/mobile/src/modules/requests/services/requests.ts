import { env } from '../../../shared/env';

export type RequestStatus = 'pending' | 'approved';

export type RequestItem = {
	id: string;
	customer_name: string;
	enterprise: string;
	email: string;
	original_language: string;
	translation_language: string;
	customer_need: string;
	status: RequestStatus;
	request_date: string;
	document: string | null;
};

export type CreateRequestPayload = {
	customer_name: string;
	enterprise: string;
	email: string;
	original_language: string;
	translation_language: string;
	customer_need: string;
	document?: { uri: string; name: string; file?: File | Blob | null } | null;
};

export type CreateRequestResult =
	| { success: true; data: RequestItem }
	| { success: false; status: number; detail?: string };

const API_BASE_URL = env.apiUrl;

export async function fetchRequests(): Promise<RequestItem[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/quotes/requests`);
		if (!response.ok) {
			throw new Error('Failed to fetch requests');
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error('Error fetching requests:', error);
		return [];
	}
}

export async function createRequest(
	payload: CreateRequestPayload,
): Promise<CreateRequestResult> {
	try {
		const formData = new FormData();
		formData.append('customer_name', payload.customer_name);
		formData.append('enterprise', payload.enterprise);
		formData.append('email', payload.email);
		formData.append('original_language', payload.original_language);
		formData.append('translation_language', payload.translation_language);
		formData.append('customer_need', payload.customer_need);

		if (payload.document) {
			if (payload.document.file) {
				formData.append(
					'document',
					payload.document.file,
					payload.document.name,
				);
			} else {
				formData.append('document', {
					uri: payload.document.uri,
					name: payload.document.name,
					type: 'application/octet-stream',
				} as unknown as Blob);
			}
		}

		const response = await fetch(`${API_BASE_URL}/api/quotes/requests`, {
			method: 'POST',
			body: formData,
		});

		const data = await response.json().catch(() => null);

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				detail: data?.detail,
			};
		}

		return { success: true, data };
	} catch (error) {
		console.error('Error creating request:', error);
		return { success: false, status: 0 };
	}
}
