import { test, expect } from '@playwright/test';

test.describe('New Request Flow', () => {
	test('should load the service request page correctly', async ({ page }) => {
		await page.goto('/solicitacao-servico');

		await expect(page.getByText('Solicitação de serviço')).toBeVisible();
		await expect(page.getByText('Dados pessoais')).toBeVisible();
		await expect(page.getByText('Serviço')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Enviar' })).toBeVisible();
	});
});
