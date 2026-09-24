import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const COMPANY = {
	id: 'company-1',
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

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contratos comerciais',
	deadline: '2026-12-01T00:00:00Z',
	status: 'em_andamento',
	items: [
		{
			id: 'item-1',
			service_order_id: 'order-1',
			quote_translation_item_id: 'quote-item-1',
			translator_id: null,
			source_language: 'Português',
			target_language: 'Inglês',
			document_type: 'Contrato',
			file_url: null,
			price: '500.00',
			deadline: '2026-11-01T00:00:00Z',
			status: 'pendente',
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z',
		},
	],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

test.describe('Service orders list', () => {
	test('loads and renders service orders with resolved company name', async ({
		page,
	}) => {
		await page.route('**/api/clients*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					items: [COMPANY],
					total: 1,
					page: 1,
					page_size: 100,
				}),
			});
		});
		await page.route('**/api/service-orders', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([SERVICE_ORDER]),
				});
				return;
			}
			await route.fallback();
		});

		await loginAs(page);
		await page.goto('/ordens-de-servico');

		await expect(
			page.getByText('Tradução de contratos comerciais'),
		).toBeVisible();
		await expect(page.getByText('Rezende Advogados')).toBeVisible();
	});

	test('shows an error message when the initial load fails', async ({
		page,
	}) => {
		await page.route('**/api/clients*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 100 }),
			});
		});
		await page.route('**/api/service-orders', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ detail: 'boom' }),
			});
		});

		await loginAs(page);
		await page.goto('/ordens-de-servico');

		await expect(
			page.getByText(
				'Não foi possível carregar as ordens de serviço. Tente novamente.',
			),
		).toBeVisible();
	});

	test('generates a new service order from a quote id', async ({ page }) => {
		let requestBody: Record<string, unknown> = {};

		await page.route('**/api/clients*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					items: [COMPANY],
					total: 1,
					page: 1,
					page_size: 100,
				}),
			});
		});
		await page.route(
			'**/api/service-orders/generate-from-quote',
			async (route) => {
				requestBody = route.request().postDataJSON() as Record<string, unknown>;
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(SERVICE_ORDER),
				});
			},
		);
		await page.route('**/api/service-orders', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([]),
				});
				return;
			}
			await route.fallback();
		});

		await loginAs(page);
		await page.goto('/ordens-de-servico');

		await page.getByText('Gerar ordem de serviço').click();
		await page
			.getByPlaceholder('Ex: 3fa85f64-5717-4562-b3fc-2c963f66afa6')
			.fill('quote-1');
		await page.getByLabel('Selecionar empresa Rezende Advogados').click();
		await page
			.getByPlaceholder('Ex: Tradução de contratos comerciais')
			.fill('Tradução de contratos comerciais');
		await page.getByText('Gerar ordem', { exact: true }).click();

		await expect(
			page.getByText('Ordem de serviço gerada com sucesso!'),
		).toBeVisible();
		expect(requestBody).toMatchObject({
			quote_id: 'quote-1',
			company_id: 'company-1',
			project_name: 'Tradução de contratos comerciais',
		});
	});
});
