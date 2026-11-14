import { test, expect } from '@playwright/test';

import {
	getInactivityTimeout,
	onInactivityTimeoutChange,
	updateInactivityTimeout,
} from '../../services/sessionTimeout';

test.describe('Session Timeout Service Unit Tests', () => {
	let originalFetch: typeof globalThis.fetch;

	test.beforeAll(() => {
		originalFetch = globalThis.fetch;
	});

	test.afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test.describe('getInactivityTimeout', () => {
		test('success - should return the current timeout', async () => {
			globalThis.fetch = async (input, init) => {
				expect(input).toContain('/api/support/inactivity-timeout');
				expect(init?.method ?? 'GET').toBe('GET');

				return {
					ok: true,
					json: async () => ({ minutes: 35 }),
				} as Response;
			};

			const response = await getInactivityTimeout();

			expect(response).toEqual({ minutes: 35 });
		});

		test('API error', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 500,
					json: async () => ({ detail: 'Internal server error' }),
				}) as Response;

			await expect(getInactivityTimeout()).rejects.toThrow(
				'Internal server error',
			);
		});
	});

	test.describe('updateInactivityTimeout', () => {
		test('success - should call the API with PATCH method and correct payload', async () => {
			let requestInfo: RequestInfo | URL | undefined;
			let requestInit: RequestInit | undefined;

			globalThis.fetch = async (input, init) => {
				requestInfo = input;
				requestInit = init;

				return {
					ok: true,
					json: async () => ({ minutes: 60 }),
				} as Response;
			};

			const response = await updateInactivityTimeout(60);

			expect(requestInfo).toContain('/api/support/inactivity-timeout');
			expect(requestInit?.method).toBe('PATCH');
			expect(JSON.parse(requestInit?.body as string)).toEqual({ minutes: 60 });
			expect(response).toEqual({ minutes: 60 });
		});

		test('forbidden (403)', async () => {
			globalThis.fetch = async () =>
				({
					ok: false,
					status: 403,
					json: async () => ({ detail: 'Permission denied' }),
				}) as Response;

			await expect(updateInactivityTimeout(60)).rejects.toThrow(
				'Permission denied',
			);
		});
	});
});

test.describe('onInactivityTimeoutChange', () => {
	let originalFetch: typeof globalThis.fetch;

	test.beforeAll(() => {
		originalFetch = globalThis.fetch;
	});

	test.afterAll(() => {
		globalThis.fetch = originalFetch;
	});

	test('notifies listeners after a successful update', async () => {
		globalThis.fetch = async () =>
			({
				ok: true,
				json: async () => ({ minutes: 15 }),
			}) as Response;

		const received: number[] = [];
		const unsubscribe = onInactivityTimeoutChange((minutes) =>
			received.push(minutes),
		);

		await updateInactivityTimeout(15);
		unsubscribe();
		await updateInactivityTimeout(15);

		expect(received).toEqual([15]);
	});

	test('does not notify listeners when the update fails', async () => {
		globalThis.fetch = async () =>
			({
				ok: false,
				status: 422,
				json: async () => ({ detail: 'Invalid value' }),
			}) as Response;

		const received: number[] = [];
		const unsubscribe = onInactivityTimeoutChange((minutes) =>
			received.push(minutes),
		);

		await expect(updateInactivityTimeout(0)).rejects.toThrow('Invalid value');
		unsubscribe();

		expect(received).toEqual([]);
	});
});
