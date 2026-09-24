import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const VIA_CEP_RESPONSE = {
	logradouro: 'Avenida Paulista',
	bairro: 'Bela Vista',
	localidade: 'Sao Paulo',
	uf: 'SP',
	erro: false,
};

async function mockEmptyCompanyList(page: import('@playwright/test').Page) {
	await page.route('**/api/clients*', async (route) => {
		if (route.request().method() === 'GET') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 100 }),
			});
			return;
		}
		await route.fallback();
	});
}

async function openNewCompanyModal(page: import('@playwright/test').Page) {
	await loginAs(page);
	await mockEmptyCompanyList(page);
	await page.route('**/viacep.com.br/**', async (route) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(VIA_CEP_RESPONSE),
		});
	});
	await page.goto('/clientes');
	await page.getByText('Novo cliente').click();
}

async function fillIdentificationStep(page: import('@playwright/test').Page) {
	await page
		.getByPlaceholder('Ex: Rezende Advogados Ltda')
		.fill('Rezende Advogados Associados Ltda');
	await page
		.getByPlaceholder('Ex: Rezende Advogados', { exact: true })
		.fill('Rezende Advogados');
	await page.getByPlaceholder('00.000.000/0000-00').fill('11222333000181');
	await page.getByPlaceholder('Ex: Jurídico').fill('Juridico');
	await page.getByText('Avançar').click();
}

async function fillContactStep(page: import('@playwright/test').Page) {
	await page.getByPlaceholder('(00) 00000-0000').fill('11987654321');
	await page
		.getByPlaceholder('contato@empresa.com')
		.fill('contato@rezendeadv.com.br');
	await page.getByText('Avançar').click();
}

test.describe('CompanyFormModal', () => {
	test('masks CNPJ and phone as the user types', async ({ page }) => {
		await openNewCompanyModal(page);

		const cnpjField = page.getByPlaceholder('00.000.000/0000-00');
		await cnpjField.fill('11222333000181');
		await expect(cnpjField).toHaveValue('11.222.333/0001-81');

		await fillIdentificationStep(page);

		const phoneField = page.getByPlaceholder('(00) 00000-0000');
		await phoneField.fill('11987654321');
		await expect(phoneField).toHaveValue('(11) 98765-4321');
	});

	test('blocks advancing to the next step when required fields are invalid', async ({
		page,
	}) => {
		await openNewCompanyModal(page);

		await page.getByText('Avançar').click();

		await expect(page.getByText('Razão social é obrigatório.')).toBeVisible();
		await expect(page.getByText('CNPJ é obrigatório.')).toBeVisible();
		await expect(page.getByPlaceholder('(00) 00000-0000')).toHaveCount(0);
	});

	test('flags an invalid phone number and keeps the user on the contact step', async ({
		page,
	}) => {
		await openNewCompanyModal(page);

		await fillIdentificationStep(page);
		await page.getByPlaceholder('(00) 00000-0000').fill('119');
		await page
			.getByPlaceholder('contato@empresa.com')
			.fill('contato@rezendeadv.com.br');
		await page.getByText('Avançar').click();

		await expect(page.getByText('Telefone inválido.')).toBeVisible();
		await expect(page.getByPlaceholder('00000-000')).toHaveCount(0);
	});

	test('autofills the address from the CEP lookup and submits the full form', async ({
		page,
	}) => {
		let requestBody: Record<string, unknown> = {};
		await page.route('**/api/clients*', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 100 }),
				});
				return;
			}
			if (route.request().method() === 'POST') {
				requestBody = route.request().postDataJSON() as Record<string, unknown>;
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify({
						id: '123e4567-e89b-12d3-a456-426614174000',
						...requestBody,
						is_active: true,
						created_at: '2026-01-01T00:00:00Z',
						updated_at: '2026-01-01T00:00:00Z',
					}),
				});
				return;
			}
			await route.fallback();
		});

		await loginAs(page);
		await page.route('**/viacep.com.br/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(VIA_CEP_RESPONSE),
			});
		});
		await page.goto('/clientes');
		await page.getByText('Novo cliente').click();

		await fillIdentificationStep(page);
		await fillContactStep(page);

		await page.getByPlaceholder('00000-000').fill('01310-100');

		await expect(page.getByPlaceholder('Ex: Avenida Paulista')).toHaveValue(
			'Avenida Paulista',
		);
		await expect(page.getByPlaceholder('Ex: Bela Vista')).toHaveValue(
			'Bela Vista',
		);
		await expect(page.getByPlaceholder('SP')).toHaveValue('SP');

		await page.getByPlaceholder('Ex: 1000').fill('1000');
		await page.getByText('Salvar').click();

		await expect(page.getByText('Novo cliente')).toHaveCount(0);
		expect(requestBody).toMatchObject({
			legal_name: 'Rezende Advogados Associados Ltda',
			cnpj: '11.222.333/0001-81',
			phone: '(11) 98765-4321',
			email: 'contato@rezendeadv.com.br',
			street: 'Avenida Paulista',
			neighborhood: 'Bela Vista',
			city: 'Sao Paulo',
			state: 'SP',
			number: '1000',
		});
	});
});
