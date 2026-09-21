import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const COMPANY_A = {
	id: '1',
	legal_name: 'Rezende Advogados Associados Ltda',
	trade_name: 'Rezende Advogados',
	cnpj: '28471095000140',
	industry: 'Juridico',
	phone: '1198765432',
	email: 'contato@rezendeadv.com.br',
	zip_code: '01310-100',
	street: 'Avenida Paulista',
	number: '1000',
	complement: null,
	neighborhood: 'Bela Vista',
	city: 'Sao Paulo',
	state: 'SP',
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const COMPANY_B = {
	...COMPANY_A,
	id: '2',
	legal_name: 'Global Servicos de Traducao Ltda',
	trade_name: 'Global Traducoes',
	cnpj: '50982716000100',
	is_active: false,
};

test.describe('Clients list (hook + service + apiClient integration)', () => {
	test('loads companies from the API on mount', async ({ page }) => {
		await page.route('**/api/clients', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([COMPANY_A, COMPANY_B]),
			});
		});

		await loginAs(page);
		await page.goto('/clientes');

		await expect(page.getByText('Rezende Advogados')).toBeVisible();
		await expect(page.getByText('Global Traducoes')).toBeVisible();
	});

	test('shows an error message when the initial load fails', async ({
		page,
	}) => {
		await page.route('**/api/clients', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ detail: 'boom' }),
			});
		});

		await loginAs(page);
		await page.goto('/clientes');

		await expect(
			page.getByText('Não foi possível carregar os clientes. Tente novamente.'),
		).toBeVisible();
	});

	test('prepends a newly created company after a successful POST', async ({
		page,
	}) => {
		let getCallCount = 0;
		await page.route('**/api/clients', async (route) => {
			if (route.request().method() === 'GET') {
				getCallCount += 1;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([COMPANY_A]),
				});
				return;
			}
			if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(COMPANY_B),
				});
				return;
			}
			await route.fallback();
		});
		await page.route('**/viacep.com.br/**', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ erro: true }),
			});
		});

		await loginAs(page);
		await page.goto('/clientes');
		await expect(page.getByText('Rezende Advogados')).toBeVisible();

		await page.getByText('Novo cliente').click();
		await page
			.getByPlaceholder('Ex: Rezende Advogados Ltda')
			.fill(COMPANY_B.legal_name);
		await page
			.getByPlaceholder('Ex: Rezende Advogados')
			.fill(COMPANY_B.trade_name);
		await page.getByPlaceholder('00.000.000/0000-00').fill(COMPANY_B.cnpj);
		await page.getByPlaceholder('Ex: Jurídico').fill(COMPANY_B.industry);
		await page.getByText('Avançar').click();

		await page.getByPlaceholder('(00) 00000-0000').fill(COMPANY_B.phone);
		await page.getByPlaceholder('contato@empresa.com').fill(COMPANY_B.email);
		await page.getByText('Avançar').click();

		await page.getByPlaceholder('00000-000').fill(COMPANY_B.zip_code);
		await page.getByPlaceholder('Ex: 1000').fill(COMPANY_B.number);
		await page.getByPlaceholder('Ex: Avenida Paulista').fill(COMPANY_B.street);
		await page.getByPlaceholder('Ex: Bela Vista').fill(COMPANY_B.neighborhood);
		await page.getByPlaceholder('Ex: São Paulo').fill(COMPANY_B.city);
		await page.getByPlaceholder('SP').fill(COMPANY_B.state);
		await page.getByText('Salvar').click();

		const rows = page.getByText(/Traducoes|Advogados/);
		await expect(rows.first()).toHaveText('Global Traducoes');
		expect(getCallCount).toBe(1);
	});

	test('removes selected companies locally without refetching the list', async ({
		page,
	}) => {
		let getCallCount = 0;
		await page.route('**/api/clients', async (route) => {
			if (route.request().method() === 'GET') {
				getCallCount += 1;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([COMPANY_A, COMPANY_B]),
				});
				return;
			}
			await route.fallback();
		});
		await page.route('**/api/clients/*', async (route) => {
			if (route.request().method() === 'DELETE') {
				await route.fulfill({ status: 204 });
				return;
			}
			await route.fallback();
		});

		await loginAs(page);
		await page.goto('/clientes');
		await expect(page.getByText('Rezende Advogados')).toBeVisible();

		await page.getByLabel('Selecionar Rezende Advogados').click();
		await page.getByRole('button', { name: 'Excluir' }).first().click();
		await page.getByRole('button', { name: 'Excluir' }).last().click();

		await expect(page.getByText('Rezende Advogados')).toHaveCount(0);
		await expect(page.getByText('Global Traducoes')).toBeVisible();
		expect(getCallCount).toBe(1);
	});
});
