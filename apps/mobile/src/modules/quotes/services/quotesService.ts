import { env } from '../../../shared/env';
import { apiPatchAuth } from '../../../shared/services/apiClient';

const API_BASE_URL = env.apiUrl;

export type QuoteFromRequestResponse = {
	id: string;
	request_id: string;
	company_id: string | null;
	contact_id: string | null;
	status: string;
	customer_name: string;
	enterprise: string;
	email: string;
	original_language: string;
	translation_language: string;
	customer_need: string;
	created_at: string;
	updated_at: string;
};

export type GenerateQuoteResult =
	| { success: true; data: QuoteFromRequestResponse }
	| { success: false; status: number; detail?: string };

export async function generateQuoteFromRequest(
	requestId: string,
): Promise<GenerateQuoteResult> {
	try {
		const response = await fetch(
			`${API_BASE_URL}/api/quotes/from-request/${encodeURIComponent(requestId)}`,
			{ method: 'POST' },
		);
		const data = await response.json().catch(() => null);

		if (!response.ok) {
			return {
				success: false,
				status: response.status,
				detail: typeof data?.detail === 'string' ? data.detail : undefined,
			};
		}

		return { success: true, data: data as QuoteFromRequestResponse };
	} catch (error) {
		console.error('Error generating quote from request:', error);
		return { success: false, status: 0 };
	}
}

export type QuoteResponse = {
	id: string;
	company_id?: string | null;
	contact_id?: string | null;
	service_order_id?: string | null;
	status: string;
	approved_at?: string | null;
	approved_by_email?: string | null;
	reproved_at?: string | null;
	reproved_by_email?: string | null;
	reproval_reason?: string | null;
	created_at: string;
	updated_at: string;
};

export type QuoteManagerItem = {
	id: string;
	quote_id: string;
	source_language: string;
	target_language: string;
	document_type: string | null;
	file_url: string | null;
	estimated_value: number | string | null;
	created_at: string;
	updated_at: string;
};

export type ManagedQuote = QuoteResponse & {
	request_id: string | null;
	customer_name: string | null;
	enterprise: string | null;
	email: string | null;
	original_language: string | null;
	translation_language: string | null;
	customer_need: string | null;
	items: QuoteManagerItem[];
	service_order_id: string | null;
};

export type QuoteStatusFilter = 'pending' | 'approved' | 'reproved' | 'all';

export type PaginatedQuotes = {
	items: ManagedQuote[];
	total: number;
	page: number;
	page_size: number;
	total_pages: number;
};

function quoteLoadErrorMessage(status?: number): string {
	if (status === 401 || status === 403) {
		return 'Sua sessão expirou. Entre novamente para continuar.';
	}
	if (status && status >= 500) {
		return 'O serviço está indisponível no momento. Tente novamente em instantes.';
	}
	return 'Verifique sua conexão com o servidor e tente novamente.';
}

function quoteDecisionErrorMessage(status: number): string {
	if (status === 401 || status === 403) {
		return 'Sua sessão expirou. Entre novamente para registrar esta decisão.';
	}
	if (status === 404)
		return 'Este orçamento não foi encontrado. Atualize a lista e tente novamente.';
	if (status === 409)
		return 'Este orçamento já recebeu uma decisão. Atualize a lista.';
	if (status === 422) return 'Confira os dados informados e tente novamente.';
	if (status === 0)
		return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
	return 'Não foi possível registrar a decisão agora. Tente novamente em instantes.';
}

export type QuoteDecisionResult =
	| { success: true; data: QuoteResponse }
	| { success: false; status: number; detail?: string };

export async function listQuotes(params: {
	page: number;
	search: string;
	status: QuoteStatusFilter;
}): Promise<PaginatedQuotes> {
	const query = new URLSearchParams({
		page: String(params.page),
		page_size: '10',
	});
	if (params.search.trim()) query.set('search', params.search.trim());
	if (params.status !== 'all') query.set('status', params.status);
	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}/api/quotes?${query.toString()}`);
	} catch (error) {
		console.error('Error loading quotes:', error);
		throw new Error(quoteLoadErrorMessage(), { cause: error });
	}
	if (!response.ok) {
		throw new Error(quoteLoadErrorMessage(response.status));
	}
	try {
		return (await response.json()) as PaginatedQuotes;
	} catch (error) {
		console.error('Invalid quotes response:', error);
		throw new Error('Não foi possível ler os orçamentos. Tente novamente.', {
			cause: error,
		});
	}
}

export type QuoteTranslationItemCreate = {
	source_language: string;
	target_language: string;
	document_type?: string;
	file_url?: string;
	estimated_value?: number;
};

export async function createQuote(): Promise<QuoteResponse | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/quotes`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		});

		if (!response.ok) {
			throw new Error(`Failed to create quote: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error creating quote:', error);
		return null;
	}
}

export async function updateQuoteStatus(
	quoteId: string,
	status: 'approved' | 'reproved',
	reprovalReason?: string,
): Promise<QuoteDecisionResult> {
	try {
		const data = await apiPatchAuth<
			QuoteResponse,
			{
				status: 'approved' | 'reproved';
				reproval_reason?: string;
			}
		>(`/api/quotes/${encodeURIComponent(quoteId)}/status`, {
			status,
			reproval_reason: reprovalReason,
		});
		return { success: true, data };
	} catch (error) {
		const apiError = error as { status?: number; message?: string };
		return {
			success: false,
			status: apiError.status ?? 0,
			detail: quoteDecisionErrorMessage(apiError.status ?? 0),
		};
	}
}

export async function createQuoteItem(
	quoteId: string,
	itemData: QuoteTranslationItemCreate,
): Promise<unknown> {
	try {
		const response = await fetch(
			`${API_BASE_URL}/api/quotes/${quoteId}/translation-items`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(itemData),
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to create quote item: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error creating quote item:', error);
		return null;
	}
}

export async function uploadQuoteDocument(
	fileUri: string,
	fileName: string,
): Promise<string | null> {
	try {
		const formData = new FormData();
		const isWeb =
			typeof window !== 'undefined' && typeof window.document !== 'undefined';

		if (isWeb) {
			const fetchResponse = await fetch(fileUri);
			const blob = await fetchResponse.blob();
			formData.append('file', blob, fileName);
		} else {
			formData.append('file', {
				uri: fileUri,
				name: fileName,
				type: 'application/octet-stream',
			} as unknown as Blob);
		}

		const response = await fetch(`${API_BASE_URL}/api/quotes/upload-document`, {
			method: 'POST',
			body: formData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Failed to upload document: ${response.status}. Details: ${errorText}`,
			);
		}

		const data = await response.json();
		return data.file_url;
	} catch (error) {
		console.error('Error uploading document:', error);
		return null;
	}
}
