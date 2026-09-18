import { test, expect } from '@playwright/test';

test.describe('New Quote Flow', () => {
	test('should load the new quote page correctly', async ({ page }) => {
		await page.goto('/quotes/new-quote');

		const title = page.getByText('Novo orçamento');
		await expect(title).toBeVisible();

		const sourceLanguageLabel = page.getByText('Idioma de origem');
		await expect(sourceLanguageLabel).toBeVisible();

		const targetLanguageLabel = page.getByText('Idioma de destino');
		await expect(targetLanguageLabel).toBeVisible();

		const attachButton = page.getByText('Anexar arquivo');
		await expect(attachButton).toBeVisible();

		const approveButton = page.getByText('Aprovar orçamento');
		await expect(approveButton).toBeVisible();
	});
});
