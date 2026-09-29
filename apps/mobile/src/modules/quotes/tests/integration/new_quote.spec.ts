import { test, expect } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

test.describe('New Quote Flow', () => {
	test('should load the new quote page correctly', async ({ page }) => {
		await loginAs(page);
		await page.goto('/orcamento/novo-orcamento');

		const title = page.getByText('Novo orçamento');
		await expect(title).toBeVisible();

		const sourceLanguageLabel = page.getByText('Idioma origem', {
			exact: true,
		});
		await expect(sourceLanguageLabel).toBeVisible();

		const targetLanguageLabel = page.getByText('Idioma destino', {
			exact: true,
		});
		await expect(targetLanguageLabel).toBeVisible();

		await expect(page.getByText('Arquivo', { exact: true })).toBeVisible();

		await expect(
			page.getByText('Criar orçamento', { exact: true }),
		).toBeVisible();
	});
});
