import { env } from '../env';

const API_BASE_URL = env.apiUrl;

export type QuoteResponse = {
	id: string;
	status: string;
	created_at: string;
	updated_at: string;
};

export type QuoteTranslationItemCreate = {
	source_language: string;
	target_language: string;
	document_type?: string;
	file_url?: string;
	estimated_value?: number;
};

export async function createQuote(
	status: string,
): Promise<QuoteResponse | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/quotes`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status }),
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
