import { expect, test } from '@playwright/test';
import { FORBIDDEN_ERROR_MESSAGE, request } from './publicApiClient';

test('uses the standard message when an API request is forbidden', async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () =>
		new Response(JSON.stringify({ detail: 'Backend-specific detail' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});

	try {
		await expect(request('/forbidden-resource')).rejects.toMatchObject({
			message: FORBIDDEN_ERROR_MESSAGE,
			status: 403,
		});
	} finally {
		globalThis.fetch = originalFetch;
	}
});
