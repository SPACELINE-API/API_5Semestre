import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './authHelper';

const FIRST_SERVICE = {
	id: 'service-1',
	quote_id: 'quote-1',
	created_by: null,
	description: 'Revisão técnica',
	price: '150.00',
	status: 'pending',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const SECOND_SERVICE = {
	...FIRST_SERVICE,
	id: 'service-2',
	description: 'Diagramação',
	price: '100.00',
};

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contrato comercial',
	deadline: '2026-12-01T00:00:00Z',
	domain_area: null,
	price_category: null,
	internal_notes: null,
	external_notes: null,
	status: 'em_andamento',
	items: [],
	files: [],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

type MockService = typeof FIRST_SERVICE;

async function mockServiceOrderApi(
	page: Page,
	options: { services: MockService[] },
) {
	const listedQuoteIds: (string | null)[] = [];
	const writeRequests: string[] = [];

	for (const path of ['clients', 'contacts', 'translators']) {
		await page.route(`**/api/${path}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
	}

	await page.route('**/api/service-orders/order-1', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(SERVICE_ORDER),
		}),
	);

	await page.route(/\/api\/quotes\/additional-services/, (route) => {
		const request = route.request();
		const url = new URL(request.url());

		if (request.method() === 'GET') {
			listedQuoteIds.push(url.searchParams.get('quote_id'));
		} else {
			writeRequests.push(`${request.method()} ${url.pathname}`);
		}

		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(options.services),
		});
	});

	return { listedQuoteIds, writeRequests };
}

async function openAdditionalServicesTab(page: Page) {
	await loginAs(page);
	await page.goto('/ordens-de-servico/order-1', {
		waitUntil: 'domcontentloaded',
	});
	await page.getByRole('tab', { name: 'Ver aba Serviços adicionais' }).click();
}

test.describe('Serviços adicionais na ordem de serviço', () => {
	test('exibe os serviços adicionais do orçamento de origem', async ({
		page,
	}) => {
		const { listedQuoteIds } = await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
		});

		await openAdditionalServicesTab(page);

		await expect(page.getByText('Revisão técnica')).toBeVisible();
		await expect(page.getByText('Diagramação')).toBeVisible();
		await expect(page.getByText('R$ 150,00')).toBeVisible();
		await expect(page.getByText('R$ 100,00')).toBeVisible();
		expect(listedQuoteIds).toContain('quote-1');
	});

	test('não permite cadastrar, editar ou concluir serviços adicionais', async ({
		page,
	}) => {
		const { writeRequests } = await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
		});

		await openAdditionalServicesTab(page);

		await expect(page.getByText('Revisão técnica')).toBeVisible();
		await expect(page.getByLabel('Novo serviço adicional')).toHaveCount(0);
		await expect(
			page.getByLabel('Editar serviço adicional Revisão técnica'),
		).toHaveCount(0);
		await expect(
			page.getByLabel('Editar serviço adicional Diagramação'),
		).toHaveCount(0);
		await expect(
			page.getByLabel(
				'Marcar serviço adicional Revisão técnica como concluído',
			),
		).toHaveCount(0);
		expect(writeRequests).toHaveLength(0);
	});

	test('exibe o status dos serviços já concluídos', async ({ page }) => {
		await mockServiceOrderApi(page, {
			services: [{ ...SECOND_SERVICE, status: 'approved' }],
		});

		await openAdditionalServicesTab(page);

		await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
	});

	test('exibe estado vazio quando o orçamento não possui serviços adicionais', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, { services: [] });

		await openAdditionalServicesTab(page);

		await expect(
			page.getByText('Esta ordem de serviço não possui serviços adicionais'),
		).toBeVisible();
		await expect(page.getByLabel('Novo serviço adicional')).toHaveCount(0);
	});

	test('exibe erro quando não é possível carregar os serviços adicionais', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, { services: [] });
		await page.route(/\/api\/quotes\/additional-services\?/, (route) =>
			route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ detail: 'Erro interno' }),
			}),
		);

		await openAdditionalServicesTab(page);

		await expect(
			page.getByText('Não foi possível carregar os serviços adicionais.'),
		).toBeVisible();
	});

	test('exibe os serviços em viewport mobile sem ações', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE],
		});

		await openAdditionalServicesTab(page);

		await expect(page.getByText('Revisão técnica')).toBeVisible();
		await expect(page.getByText('R$ 150,00')).toBeVisible();
		await expect(
			page.getByLabel('Editar serviço adicional Revisão técnica'),
		).toHaveCount(0);
	});
});
