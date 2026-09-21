import { test, expect } from '@playwright/test';

test.describe('Contact Modal Integration', () => {
	test('should open contact modal and show fields correctly', async ({
		page,
	}) => {
		await page.goto('/clientes/1');

		const clientsTab = page.getByText('Clientes', { exact: true });
		await clientsTab.click();

		const addBtn = page.getByText('Adicionar funcionário');
		await addBtn.click();

		const modalTitle = page.getByText('Novo funcionário');
		await expect(modalTitle).toBeVisible();

		await expect(page.getByText('Nome', { exact: true })).toBeVisible();
		await expect(page.getByText('Departamento', { exact: true })).toBeVisible();
		await expect(page.getByText('Telefone', { exact: true })).toBeVisible();
		await expect(page.getByText('Email', { exact: true })).toBeVisible();

		const saveBtn = page.getByText('Salvar', { exact: true });
		await expect(saveBtn).toBeVisible();
	});
});
