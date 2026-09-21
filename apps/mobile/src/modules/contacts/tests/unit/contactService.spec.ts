import { test, expect } from '@playwright/test';

import {
	createContact,
	listContacts,
	getContact,
	updateContact,
	deleteContact,
} from '../../services/contactService';

test.describe('Contact Service Unit Tests', () => {
	const mockContact = {
		id: '00000000-0000-0000-0000-000000000002',
		name: 'John Doe',
		email: '[johndoe@example.com](mailto:johndoe@example.com)',
		phone: '(11) 98765-4321',
		department: 'Financeiro',
		company_id: '00000000-0000-0000-0000-000000000001',
		created_at: '2023-01-01T00:00:00Z',
		updated_at: '2023-01-01T00:00:00Z',
	};

	let originalFetch: typeof globalThis.fetch;

	test.beforeAll(() => {
		originalFetch = globalThis.fetch;
	});

	test.afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test.describe('createContact', () => {
		test('success - should call the API with POST method and correct payload', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => mockContact,
				} as Response;
			};

			const payload = {
				name: 'John Doe',
				email: 'johndoe@example.com',
				phone: '(11) 98765-4321',
				department: 'Financeiro',
				company_id: '00000000-0000-0000-0000-000000000001',
			};

			const response = await createContact(payload);

			expect(requestInfo).toContain('/api/contacts');
			expect(requestInit?.method).toBe('POST');

			const sentBody = JSON.parse(requestInit?.body as string);

			expect(sentBody).toEqual(payload);
			expect(response).toEqual(mockContact);
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 422,
					json: async () => ({ detail: 'Invalid email' }),
				}) as Response;

			const payload = {
				name: 'John Doe',
				email: 'invalid',
				phone: '(11) 98765-4321',
				department: 'Financeiro',
				company_id: '123',
			};

			await expect(createContact(payload)).rejects.toThrow('Invalid email');
		});
	});

	test.describe('listContacts', () => {
		test('success - should list contacts', async () => {
			globalThis.fetch = async (input, init) => {
				expect(input).toContain('/api/contacts');
				expect(init?.method ?? 'GET').toBe('GET');

				return {
					ok: true,
					json: async () => [mockContact],
				} as Response;
			};

			const response = await listContacts();

			expect(response).toEqual([mockContact]);
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 500,
					json: async () => ({ detail: 'Internal server error' }),
				}) as Response;

			await expect(listContacts()).rejects.toThrow('Internal server error');
		});
	});

	test.describe('getContact', () => {
		test('success - should return a specific contact', async () => {
			globalThis.fetch = async (input, init) => {
				expect(input).toContain(`/api/contacts/${mockContact.id}`);
				expect(init?.method ?? 'GET').toBe('GET');

				return {
					ok: true,
					json: async () => mockContact,
				} as Response;
			};

			const response = await getContact(mockContact.id);

			expect(response).toEqual(mockContact);
		});

		test('contact not found (404)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Contact not found' }),
				}) as Response;

			await expect(getContact('id-inexistente')).rejects.toThrow(
				'Contact not found',
			);
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 500,
					json: async () => ({ detail: 'Internal error' }),
				}) as Response;

			await expect(getContact(mockContact.id)).rejects.toThrow(
				'Internal error',
			);
		});
	});

	test.describe('updateContact', () => {
		test('success - should call PATCH method', async () => {
			const updatePayload = { name: 'Jane Doe' };

			globalThis.fetch = async (input, init) => {
				expect(input).toContain(`/api/contacts/${mockContact.id}`);
				expect(init?.method).toBe('PATCH');

				expect(JSON.parse(init?.body as string)).toEqual(updatePayload);

				return {
					ok: true,
					json: async () => ({
						...mockContact,
						...updatePayload,
					}),
				} as Response;
			};

			const response = await updateContact(mockContact.id, updatePayload);

			expect(response.name).toBe('Jane Doe');
		});

		test('contact not found', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 404,
					json: async () => ({ detail: 'Contact not found' }),
				}) as Response;

			await expect(
				updateContact('id-inexistente', { name: 'Test' }),
			).rejects.toThrow('Contact not found');
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 500,
					json: async () => ({ detail: 'Internal error' }),
				}) as Response;

			await expect(
				updateContact(mockContact.id, { name: 'Test' }),
			).rejects.toThrow('Internal error');
		});
	});

	test.describe('deleteContact', () => {
		test('success - should call DELETE method', async () => {
			globalThis.fetch = async (input, init) => {
				expect(input).toContain(`/api/contacts/${mockContact.id}`);
				expect(init?.method).toBe('DELETE');

				return {
					ok: true,
					json: async () => null,
				} as Response;
			};

			await expect(deleteContact(mockContact.id)).resolves.toBeUndefined();
		});

		test('conflict (409)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 409,
					json: async () => ({
						detail: 'Cannot delete contact with history.',
					}),
				}) as Response;

			await expect(deleteContact(mockContact.id)).rejects.toThrow(
				'Cannot delete contact with history.',
			);
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 500,
					json: async () => ({ detail: 'Internal error' }),
				}) as Response;

			await expect(deleteContact(mockContact.id)).rejects.toThrow(
				'Internal error',
			);
		});
	});
});
