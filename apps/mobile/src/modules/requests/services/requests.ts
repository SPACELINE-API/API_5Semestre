import { env } from '../../../shared/env';

export type RequestStatus = 'pending' | 'approved' | 'reproved';

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
	approved_at?: string | null;
	reproved_at?: string | null;
	reproval_reason?: string | null;
	document: string | null;
};

export type RequestStatusUpdateResult =
	| { success: true; data: RequestItem }
	| { success: false; status: number; detail?: string };

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
	const response = await fetch(`${API_BASE_URL}/api/quotes/requests`);
	if (!response.ok) {
		throw new Error(`Não foi possível carregar as solicitações (${response.status}).`);
	}
	return (await response.json()) as RequestItem[];
}

export async function fetchRequestById(
	requestId: string,
): Promise<RequestItem | null> {
	const response = await fetch(`${API_BASE_URL}/api/quotes/requests`);
	if (!response.ok) {
		throw new Error('Não foi possível carregar as requisições.');
	}

	const requests: RequestItem[] = await response.json();
	return requests.find((request) => request.id === requestId) ?? null;
}

export async function updateRequestStatus(
	requestId: string,
	status: Extract<RequestStatus, 'approved' | 'reproved'>,
	reprovalReason?: string,
): Promise<RequestStatusUpdateResult> {
	try {
		const response = await fetch(
			`${API_BASE_URL}/api/quotes/requests/${encodeURIComponent(requestId)}/status`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status,
					...(status === 'reproved'
						? { reproval_reason: reprovalReason?.trim() }
						: {}),
				}),
			},
		);
		const data = await response.json().catch(() => null);

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				detail: typeof data?.detail === 'string' ? data.detail : undefined,
			};
		}

		return { success: true, data: data as RequestItem };
	} catch (error) {
		console.error('Error updating request status:', error);
		return { success: false, status: 0 };
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
