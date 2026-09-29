import { env } from '../../../shared/env';
import {
	MultipartUploadError,
	uploadFileMultipart,
} from '../../../shared/utils/uploadFileMultipart';
import { getSession } from '../../auth/services/auth';

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
	reproved_by_email?: string | null;
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
	document?: {
		uri: string;
		name: string;
		type?: string | null;
		file?: File | Blob | null;
	} | null;
};

export type CreateRequestResult =
	| { success: true; data: RequestItem }
	| { success: false; status: number; detail?: string };

const API_BASE_URL = env.apiUrl;

export async function fetchRequests(): Promise<RequestItem[]> {
	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}/api/quotes/requests`);
	} catch (error) {
		console.error('Error loading requests:', error);
		throw new Error(
			'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
		);
	}

	if (!response.ok) {
		throw new Error(
			'Não foi possível carregar as solicitações. Tente novamente.',
		);
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
		const session = getSession();
		const response = await fetch(
			`${API_BASE_URL}/api/quotes/requests/${encodeURIComponent(requestId)}/status`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					...(session?.access_token
						? { Authorization: `Bearer ${session.access_token}` }
						: {}),
				},
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
		const fields = {
			customer_name: payload.customer_name,
			enterprise: payload.enterprise,
			email: payload.email,
			original_language: payload.original_language,
			translation_language: payload.translation_language,
			customer_need: payload.customer_need,
		};

		if (payload.document) {
			const hasWebFile =
				payload.document.file != null &&
				(typeof document !== 'undefined' ||
					(typeof Blob !== 'undefined' &&
						payload.document.file instanceof Blob));
			if (typeof document !== 'undefined' && !payload.document.file) {
				throw new Error(
					'Não foi possível acessar o arquivo selecionado. Escolha-o novamente.',
				);
			}

			const documentFile = hasWebFile
				? (payload.document.file as File)
				: {
						uri: payload.document.uri,
						name: payload.document.name,
						type: payload.document.type ?? 'application/octet-stream',
					};
			const data = await uploadFileMultipart<RequestItem>(
				`${API_BASE_URL}/api/quotes/requests`,
				documentFile,
				fields,
				'POST',
				'document',
			);

			return { success: true, data };
		}

		const formData = new FormData();
		Object.entries(fields).forEach(([name, value]) =>
			formData.append(name, value),
		);

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
		return {
			success: false,
			status: error instanceof MultipartUploadError ? error.status : 0,
			detail: error instanceof Error ? error.message : undefined,
		};
	}
}
