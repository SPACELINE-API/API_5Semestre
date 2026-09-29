import { test, expect } from '@playwright/test';

test.describe('New Request Flow', () => {
	test('should load the service request page correctly', async ({ page }) => {
		await page.goto('/solicitar-servico');

		await expect(page.getByText('Solicitação de serviço')).toBeVisible();
		await expect(page.getByText('Dados pessoais')).toBeVisible();
		await expect(page.getByText('SERVIÇO', { exact: true })).toBeVisible();
		await expect(
			page.getByText('ENVIAR SOLICITAÇÃO', { exact: true }),
		).toBeVisible();
	});

	test('should show the document upload area', async ({ page }) => {
		await page.goto('/solicitar-servico');

		await expect(page.getByText('Documento (PDF/DOCX)')).toBeVisible();
		await expect(
			page.getByText('Faça o upload do documento a ser traduzido'),
		).toBeVisible();
	});
});
