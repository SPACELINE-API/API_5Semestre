import { test, expect } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const COMPANY = {
	id: '1',
	legal_name: 'Empresa Exemplo Ltda',
	trade_name: 'Empresa Exemplo',
	cnpj: '28471095000140',
	industry: 'Jurídico',
	phone: '(11) 98765-4321',
	email: 'contato@empresa.com',
	zip_code: '01310-100',
	street: 'Avenida Paulista',
	number: '1000',
	complement: null,
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP',
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

test.describe('Contact Modal Integration', () => {
	test('should open contact modal and show fields correctly', async ({
		page,
	}) => {
		await page.route('**/api/clients/1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(COMPANY),
			});
		});
		await page.route('**/api/contacts', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([]),
			});
		});
		await loginAs(page);
		await page.goto('/clientes/1');
		await page.getByText('Funcionários', { exact: true }).last().click();
		await page.getByText('Adicionar funcionário', { exact: true }).click();

		const modalTitle = page.getByText('Novo funcionário');
		await expect(modalTitle).toBeVisible();

		const dialog = page.getByRole('dialog');
		await expect(dialog.getByText('Nome', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Departamento', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Telefone', { exact: true })).toBeVisible();
		await expect(dialog.getByText('Email', { exact: true })).toBeVisible();
		await expect(dialog.getByPlaceholder('Ex: João da Silva')).toHaveAttribute(
			'maxLength',
			'150',
		);
		await expect(dialog.getByPlaceholder('Ex: Financeiro')).toHaveAttribute(
			'maxLength',
			'100',
		);
		await expect(dialog.getByPlaceholder('joao@empresa.com')).toHaveAttribute(
			'maxLength',
			'255',
		);

		const saveBtn = dialog.getByText('Salvar', { exact: true });
		await expect(saveBtn).toBeVisible();
	});
});
