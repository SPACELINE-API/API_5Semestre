import { apiGetAuth } from '../../../shared/services/apiClient';
import { ApiError } from '../../../shared/services/publicApiClient';

export type QuoteReceiptStatus = 'available' | 'sent' | 'error';

export type QuoteReceipt = {
	quote_id: string;
	company_id: string | null;
	status: QuoteReceiptStatus;
	pdf_url: string | null;
	generated_at: string | null;
	sent_at: string | null;
	error_message: string | null;
};

export type QuoteReceiptVersion = {
	id: string;
	version: number;
	status: QuoteReceiptStatus;
	pdf_url: string | null;
	total_value: string | null;
	approved_at: string | null;
	generated_at: string | null;
	sent_at: string | null;
	error_message: string | null;
};

export async function listQuoteReceiptVersions(
	quoteId: string,
): Promise<QuoteReceiptVersion[]> {
	return apiGetAuth<QuoteReceiptVersion[]>(
		`/api/quotes/${encodeURIComponent(quoteId)}/receipts`,
	);
}

export type QuoteReceiptResult =
	{ found: true; receipt: QuoteReceipt } | { found: false };

export async function getQuoteReceipt(
	quoteId: string,
): Promise<QuoteReceiptResult> {
	try {
		const receipt = await apiGetAuth<QuoteReceipt>(
			`/api/quotes/${encodeURIComponent(quoteId)}/receipt`,
		);
		return { found: true, receipt };
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return { found: false };
		}
		throw new Error(
			'Não foi possível consultar o comprovante comercial. Tente novamente.',
			{ cause: error },
		);
	}
}

export async function getQuoteReceiptDownloadUrl(
	quoteId: string,
): Promise<string> {
	try {
		const { download_url } = await apiGetAuth<{ download_url: string }>(
			`/api/quotes/${encodeURIComponent(quoteId)}/receipt/download`,
		);
		return download_url;
	} catch (error) {
		throw new Error(
			error instanceof ApiError && error.status === 404
				? 'O PDF do comprovante não está disponível.'
				: 'Não foi possível abrir o PDF do comprovante. Tente novamente.',
			{ cause: error },
		);
	}
}
