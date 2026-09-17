import { test, expect } from '@playwright/test';
import { fetchLanguages } from '../../../../shared/services/languageService';

test.describe('Language Service Unit Tests', () => {
	test('should verify fetchLanguages definition', async () => {
		expect(typeof fetchLanguages).toBe('function');
	});

	test('should fetch languages from API', async () => {
		const originalFetch = globalThis.fetch;

		globalThis.fetch = async () =>
			({
				ok: true,
				json: async () => [{ id: 'pt-BR', name: 'Português' }],
			}) as Response;

		try {
			const languages = await fetchLanguages();
			expect(languages).toHaveLength(1);
			expect(languages[0].id).toBe('pt-BR');
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
