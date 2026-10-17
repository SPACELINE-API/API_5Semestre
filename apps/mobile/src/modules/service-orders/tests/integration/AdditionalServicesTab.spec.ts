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
type ApiResult = { status: number; body: unknown };

async function mockServiceOrderApi(
	page: Page,
	options: {
		services: MockService[];
		onCreate?: (body: Record<string, unknown>) => ApiResult;
		onUpdate?: (id: string, body: Record<string, unknown>) => ApiResult;
		onStatusUpdate?: (id: string, body: Record<string, unknown>) => ApiResult;
	},
) {
	const services = [...options.services];
	const listedQuoteIds: (string | null)[] = [];

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
		const fulfill = (result: ApiResult) =>
			route.fulfill({
				status: result.status,
				contentType: 'application/json',
				body: JSON.stringify(result.body),
			});

		if (request.method() === 'GET') {
			listedQuoteIds.push(url.searchParams.get('quote_id'));
			return fulfill({ status: 200, body: services });
		}

		const body = request.postDataJSON() as Record<string, unknown>;

		if (request.method() === 'PATCH') {
			const segments = url.pathname.split('/');
			const isStatusRoute = segments.at(-1) === 'status';
			const id = (isStatusRoute ? segments.at(-2) : segments.at(-1)) ?? '';
			const handler = isStatusRoute ? options.onStatusUpdate : options.onUpdate;
			const result = handler?.(id, body) ?? {
				status: 500,
				body: { detail: 'Não esperado' },
			};
			if (result.status === 200) {
				const index = services.findIndex((service) => service.id === id);
				services[index] = result.body as MockService;
			}
			return fulfill(result);
		}

		const result = options.onCreate?.(body) ?? {
			status: 500,
			body: { detail: 'Não esperado' },
		};
		if (result.status === 201) {
			services.push(result.body as MockService);
		}
		return fulfill(result);
	});

	return { listedQuoteIds };
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
		await expect(
			page.getByLabel('Editar serviço adicional Revisão técnica'),
		).toBeVisible();
		expect(listedQuoteIds).toContain('quote-1');
	});

	test('exibe estado vazio quando o orçamento não possui serviços adicionais', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, { services: [] });

		await openAdditionalServicesTab(page);

		await expect(
			page.getByText('Esta ordem de serviço não possui serviços adicionais'),
		).toBeVisible();
		await expect(page.getByLabel('Novo serviço adicional')).toBeVisible();
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

	test('cadastra pela ordem de serviço vinculando ao orçamento de origem', async ({
		page,
	}) => {
		let sentBody: Record<string, unknown> | undefined;
		await mockServiceOrderApi(page, {
			services: [],
			onCreate: (body) => {
				sentBody = body;
				return {
					status: 201,
					body: { ...FIRST_SERVICE, description: body.description },
				};
			},
		});

		await openAdditionalServicesTab(page);
		await page.getByLabel('Novo serviço adicional').click();
		await expect(
			page.getByLabel('Confirmar cadastro do serviço adicional'),
		).toBeVisible();

		await page.getByPlaceholder('Ex: Revisão técnica').fill('Revisão técnica');
		await page.getByPlaceholder('R$ 0,00').fill('15000');
		await page.getByLabel('Confirmar cadastro do serviço adicional').click();

		await expect.poll(() => sentBody).toBeDefined();
		expect(sentBody).toEqual({
			description: 'Revisão técnica',
			price: 150,
			quote_id: 'quote-1',
		});
		await expect(
			page.getByText('Serviço adicional cadastrado com sucesso!'),
		).toBeVisible();
		await expect(page.getByText('Revisão técnica')).toBeVisible();
	});

	test('edita um serviço adicional pelo botão do card', async ({ page }) => {
		let updated: { id: string; body: Record<string, unknown> } | undefined;
		await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
			onUpdate: (id, body) => {
				updated = { id, body };
				return {
					status: 200,
					body: {
						...SECOND_SERVICE,
						description: body.description,
						price: Number(body.price).toFixed(2),
					},
				};
			},
		});

		await openAdditionalServicesTab(page);
		await page.getByLabel('Editar serviço adicional Diagramação').click();

		await expect(page.getByText('Editar serviço adicional')).toBeVisible();
		await expect(page.getByPlaceholder('Ex: Revisão técnica')).toHaveValue(
			'Diagramação',
		);
		await page
			.getByPlaceholder('Ex: Revisão técnica')
			.fill('Diagramação bilíngue');
		await page.getByPlaceholder('R$ 0,00').fill('12000');
		await page.getByLabel('Confirmar edição do serviço adicional').click();

		await expect.poll(() => updated).toBeDefined();
		expect(updated).toEqual({
			id: 'service-2',
			body: { description: 'Diagramação bilíngue', price: 120 },
		});
		await expect(
			page.getByText('Serviço adicional atualizado com sucesso!'),
		).toBeVisible();
		await expect(page.getByText('Diagramação bilíngue')).toBeVisible();
		await expect(page.getByText('R$ 120,00')).toBeVisible();
	});

	test('mantém o modal de edição aberto e exibe o erro retornado pela API', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
			onUpdate: () => ({
				status: 409,
				body: {
					detail:
						'Já existe um serviço adicional com essa descrição neste orçamento',
				},
			}),
		});

		await openAdditionalServicesTab(page);
		await page.getByLabel('Editar serviço adicional Diagramação').click();
		await page.getByPlaceholder('Ex: Revisão técnica').fill('Revisão técnica');
		await page.getByLabel('Confirmar edição do serviço adicional').click();

		await expect(
			page.getByText(
				'Já existe um serviço adicional com essa descrição neste orçamento',
			),
		).toBeVisible();
		await expect(
			page.getByLabel('Confirmar edição do serviço adicional'),
		).toBeVisible();
	});

	test('marca um serviço adicional pendente como concluído pelo botão do card', async ({
		page,
	}) => {
		let statusUpdate: { id: string; body: Record<string, unknown> } | undefined;
		let editCalls = 0;
		await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
			onUpdate: () => {
				editCalls += 1;
				return { status: 200, body: FIRST_SERVICE };
			},
			onStatusUpdate: (id, body) => {
				statusUpdate = { id, body };
				return { status: 200, body: { ...FIRST_SERVICE, status: body.status } };
			},
		});

		await openAdditionalServicesTab(page);
		await page
			.getByLabel('Marcar serviço adicional Revisão técnica como concluído')
			.click();

		await expect.poll(() => statusUpdate).toBeDefined();
		expect(statusUpdate).toEqual({
			id: 'service-1',
			body: { status: 'approved' },
		});
		expect(editCalls).toBe(0);
		await expect(
			page.getByText('Serviço adicional concluído com sucesso!'),
		).toBeVisible();
		await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
		await expect(
			page.getByLabel(
				'Marcar serviço adicional Revisão técnica como concluído',
			),
		).toHaveCount(0);
	});

	test('não exibe o botão de concluir para um serviço já concluído', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, {
			services: [{ ...SECOND_SERVICE, status: 'approved' }],
		});

		await openAdditionalServicesTab(page);

		await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
		await expect(
			page.getByLabel('Editar serviço adicional Diagramação'),
		).toBeVisible();
		await expect(
			page.getByLabel('Marcar serviço adicional Diagramação como concluído'),
		).toHaveCount(0);
	});

	test('mantém o serviço pendente e exibe o erro quando a conclusão falha', async ({
		page,
	}) => {
		await mockServiceOrderApi(page, {
			services: [FIRST_SERVICE],
			onStatusUpdate: () => ({
				status: 404,
				body: { detail: 'Serviço adicional não encontrado' },
			}),
		});

		await openAdditionalServicesTab(page);
		await page
			.getByLabel('Marcar serviço adicional Revisão técnica como concluído')
			.click();

		await expect(
			page.getByText('Serviço adicional não encontrado'),
		).toBeVisible();
		await expect(page.getByText('Pendente')).toBeVisible();
		await expect(
			page.getByLabel(
				'Marcar serviço adicional Revisão técnica como concluído',
			),
		).toBeVisible();
	});
});
