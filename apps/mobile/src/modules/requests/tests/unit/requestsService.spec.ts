import { test, expect } from '@playwright/test';
import { createRequest } from '../../services/requests';

test.describe('Requests Service Unit Tests', () => {
	test('should verify createRequest definition', async () => {
		expect(typeof createRequest).toBe('function');
	});

	test('should create a request via API', async () => {
		const originalFetch = globalThis.fetch;

		globalThis.fetch = async () =>
			({
				ok: true,
				json: async () => ({
					id: '123e4567-e89b-12d3-a456-426614174000',
					customer_name: 'João Silva',
					enterprise: 'Padilhas Company',
					status: 'pending',
				}),
			}) as Response;

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
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
