import { test, expect } from '@playwright/test';

import {
	createAdditionalService,
	deleteAdditionalService,
	getAdditionalService,
	listAdditionalServicesByQuote,
	updateAdditionalService,
	updateAdditionalServiceStatus,
} from '../../services/additionalService';
import { clearSession, saveSession } from '../../../auth/services/auth';

test.describe('Additional Service Unit Tests', () => {
	const quoteId = '00000000-0000-0000-0000-000000000001';

	const mockAdditionalService = {
		id: '00000000-0000-0000-0000-000000000003',
		quote_id: quoteId,
		created_by: null,
		description: 'Revisão técnica',
		price: '150.00',
		status: 'pending',
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
	};

	let originalFetch: typeof globalThis.fetch;

	test.beforeAll(() => {
		originalFetch = globalThis.fetch;
		saveSession({
			access_token: 'test-access-token',
			token_type: 'bearer',
			expires_in: 3600,
			user: { id: 'test-user-id', email: 'admin@spaceline.com.br' },
		});
	});

	test.afterAll(() => {
		globalThis.fetch = originalFetch;
		clearSession();
	});

	test.describe('createAdditionalService', () => {
		test('success - should POST to the quote with the auth header', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => mockAdditionalService,
				} as Response;
			};

			const payload = {
				quote_id: quoteId,
				description: 'Revisão técnica',
				price: 150,
			};

			const response = await createAdditionalService(payload);

			expect(String(requestInfo)).toMatch(
				/\/api\/quotes\/additional-services$/,
			);
			expect(requestInit?.method).toBe('POST');
			expect(
				(requestInit?.headers as Record<string, string>).Authorization,
			).toBe('Bearer test-access-token');
			expect(JSON.parse(requestInit?.body as string)).toEqual(payload);
			expect(response).toEqual(mockAdditionalService);
		});

		test('duplicated description (409)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 409,
					json: async () => ({
						detail:
							'Já existe um serviço adicional com essa descrição neste orçamento',
					}),
				}) as Response;

			await expect(
				createAdditionalService({
					quote_id: quoteId,
					description: 'Revisão técnica',
					price: 150,
				}),
			).rejects.toThrow(
				'Já existe um serviço adicional com essa descrição neste orçamento',
			);
		});

		test('validation error (422)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 422,
					json: async () => ({
						detail: [{ msg: 'Value error, A descrição não pode ser vazia' }],
					}),
				}) as Response;

			await expect(
				createAdditionalService({
					quote_id: quoteId,
					description: ' ',
					price: 150,
				}),
			).rejects.toThrow('A descrição não pode ser vazia');
		});

		test('network error', async () => {
			globalThis.fetch = async () => {
				throw new TypeError('Failed to fetch');
			};

			await expect(
				createAdditionalService({
					quote_id: quoteId,
					description: 'Revisão técnica',
					price: 150,
				}),
			).rejects.toThrow('Não foi possível conectar à API.');
		});
	});

	test.describe('listAdditionalServicesByQuote', () => {
		test('success - should filter by quote_id', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => [mockAdditionalService],
				} as Response;
			};

			const response = await listAdditionalServicesByQuote(quoteId);

			const url = new URL(String(requestInfo));
			expect(url.pathname).toBe('/api/quotes/additional-services');
			expect(url.searchParams.get('quote_id')).toBe(quoteId);
			expect(requestInit?.method ?? 'GET').toBe('GET');
			expect(response).toEqual([mockAdditionalService]);
		});

		test('quote not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Orçamento não encontrado' }),
				}) as Response;

			await expect(listAdditionalServicesByQuote(quoteId)).rejects.toThrow(
				'Orçamento não encontrado',
			);
		});
	});

	test.describe('getAdditionalService', () => {
		test('success - should return a specific additional service', async () => {
			globalThis.fetch = async (input) => {
				expect(String(input)).toContain(
					`/api/quotes/additional-services/${mockAdditionalService.id}`,
				);

				return {
					ok: true,
					json: async () => mockAdditionalService,
				} as Response;
			};

			const response = await getAdditionalService(mockAdditionalService.id);

			expect(response).toEqual(mockAdditionalService);
		});

		test('additional service not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Serviço adicional não encontrado' }),
				}) as Response;

			await expect(getAdditionalService('id-inexistente')).rejects.toThrow(
				'Serviço adicional não encontrado',
			);
		});
	});

	test.describe('updateAdditionalService', () => {
		test('success - should PATCH only the sent fields with the auth header', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => ({ ...mockAdditionalService, price: '80.00' }),
				} as Response;
			};

			const response = await updateAdditionalService(mockAdditionalService.id, {
				price: 80,
			});

			expect(String(requestInfo)).toContain(
				`/api/quotes/additional-services/${mockAdditionalService.id}`,
			);
			expect(requestInit?.method).toBe('PATCH');
			expect(
				(requestInit?.headers as Record<string, string>).Authorization,
			).toBe('Bearer test-access-token');
			expect(JSON.parse(requestInit?.body as string)).toEqual({ price: 80 });
			expect(response.price).toBe('80.00');
		});

		test('duplicated description (409)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 409,
					json: async () => ({
						detail:
							'Já existe um serviço adicional com essa descrição neste orçamento',
					}),
				}) as Response;

			await expect(
				updateAdditionalService(mockAdditionalService.id, {
					description: 'Diagramação',
				}),
			).rejects.toThrow(
				'Já existe um serviço adicional com essa descrição neste orçamento',
			);
		});

		test('additional service not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Serviço adicional não encontrado' }),
				}) as Response;

			await expect(
				updateAdditionalService('id-inexistente', { price: 80 }),
			).rejects.toThrow('Serviço adicional não encontrado');
		});
	});

	test.describe('updateAdditionalServiceStatus', () => {
		test('success - should PATCH the status route with the auth header', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => ({ ...mockAdditionalService, status: 'approved' }),
				} as Response;
			};

			const response = await updateAdditionalServiceStatus(
				mockAdditionalService.id,
				'approved',
			);

			expect(String(requestInfo)).toMatch(
				new RegExp(
					`/api/quotes/additional-services/${mockAdditionalService.id}/status$`,
				),
			);
			expect(requestInit?.method).toBe('PATCH');
			expect(
				(requestInit?.headers as Record<string, string>).Authorization,
			).toBe('Bearer test-access-token');
			expect(JSON.parse(requestInit?.body as string)).toEqual({
				status: 'approved',
			});
			expect(response.status).toBe('approved');
		});

		test('additional service not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Serviço adicional não encontrado' }),
				}) as Response;

			await expect(
				updateAdditionalServiceStatus('id-inexistente', 'approved'),
			).rejects.toThrow('Serviço adicional não encontrado');
		});
	});

	test.describe('deleteAdditionalService', () => {
		test('success - should call DELETE method', async () => {
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				expect(String(input)).toContain(
					`/api/quotes/additional-services/${mockAdditionalService.id}`,
				);
				requestInit = init;

				return { ok: true, json: async () => null } as Response;
			};

			await expect(
				deleteAdditionalService(mockAdditionalService.id),
			).resolves.toBeUndefined();
			expect(requestInit?.method).toBe('DELETE');
		});

		test('additional service not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Serviço adicional não encontrado' }),
				}) as Response;

			await expect(deleteAdditionalService('id-inexistente')).rejects.toThrow(
				'Serviço adicional não encontrado',
			);
		});
	});
});
