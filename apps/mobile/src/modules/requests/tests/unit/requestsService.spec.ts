import { test, expect } from '@playwright/test';
import { createRequest } from '../../services/requests';

test.describe('Requests Service Unit Tests', () => {
	test('should verify createRequest definition', async () => {
		expect(typeof createRequest).toBe('function');
	});

	test('should create a request via API without a document', async () => {
		const originalFetch = globalThis.fetch;
		let capturedBody: FormData | null = null;

		globalThis.fetch = async (_url, init) => {
			capturedBody = init?.body as FormData;
			return {
				ok: true,
				json: async () => ({
					id: '123e4567-e89b-12d3-a456-426614174000',
					customer_name: 'João Silva',
					enterprise: 'Padilhas Company',
					status: 'pending',
				}),
			} as Response;
		};

		try {
			const result = await createRequest({
				customer_name: 'João Silva',
				enterprise: 'Padilhas Company',
				email: 'joao@teste.com',
				original_language: 'Português',
				translation_language: 'Francês',
				customer_need: 'Contrato Social',
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.customer_name).toBe('João Silva');
			}

			expect(capturedBody).toBeInstanceOf(FormData);
			expect((capturedBody as FormData | null)?.get('customer_name')).toBe('João Silva');
			expect((capturedBody as FormData | null)?.get('document')).toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	test('should send the document as part of the same multipart request', async () => {
		const originalFetch = globalThis.fetch;
		let capturedUrl: string | undefined;
		let capturedBody: FormData | null = null;
		
		globalThis.fetch = async (url, init) => {
			capturedUrl = url as string;
			capturedBody = init?.body as FormData;

			return {
				ok: true,
				json: async () => ({
					id: '123e4567-e89b-12d3-a456-426614174001',
					customer_name: 'Maria Souza',
					enterprise: 'Empresa Y',
					status: 'pending',
				}),
			} as Response;
		};

		try {
			const result = await createRequest({
				customer_name: 'Maria Souza',
				enterprise: 'Empresa Y',
				email: 'maria@teste.com',
				original_language: 'Português',
				translation_language: 'Inglês',
				customer_need: 'Diploma',
				document: { uri: 'file:///tmp/diploma.pdf', name: 'diploma.pdf' },
			});

			expect(result.success).toBe(true);
			expect(capturedUrl).toContain('/api/quotes/requests');
			expect(capturedBody).toBeInstanceOf(FormData);
			expect((capturedBody as FormData | null)?.get('document')).not.toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
