import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const QUOTE = {
	id: 'quote-1',
	request_id: null,
	company_id: 'company-1',
	contact_id: null,
	service_order_id: 'order-1',
	status: 'approved',
	approved_at: '2026-01-01T00:00:00Z',
	approved_by_email: 'admin@spaceline.com.br',
	reproved_at: null,
	reproved_by_email: null,
	reproval_reason: null,
	total_value: '250.00',
	customer_name: 'Maria Souza',
	enterprise: 'Acme',
	email: 'maria@acme.com',
	original_language: 'Português',
	translation_language: 'Inglês',
	customer_need: 'Contrato',
	items: [],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const FIRST_SERVICE = {
	id: 'service-1',
	quote_id: 'quote-1',
	created_by: null,
	description: 'Diagramação',
	price: '100.00',
	status: 'pending',
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const SECOND_SERVICE = {
	...FIRST_SERVICE,
	id: 'service-2',
	description: 'Revisão técnica',
	price: '150.00',
	status: 'approved',
};

type ApiResult = { status: number; body: unknown };

async function mockQuotesApi(
	page: Page,
	options: {
		services: unknown[];
		onCreate?: (body: Record<string, unknown>) => ApiResult;
		onUpdate?: (id: string, body: Record<string, unknown>) => ApiResult;
	},
) {
	const quoteUpdates: unknown[] = [];

	await page.route(/\/api\/(quotes|clients)/, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const fulfill = (result: ApiResult) =>
			route.fulfill({
				status: result.status,
				contentType: 'application/json',
				body: JSON.stringify(result.body),
			});

		if (url.pathname === '/api/quotes/additional-services') {
			if (request.method() === 'POST' && options.onCreate) {
				return fulfill(
					options.onCreate(request.postDataJSON() as Record<string, unknown>),
				);
			}
			return fulfill({ status: 200, body: options.services });
		}

		if (url.pathname.startsWith('/api/quotes/additional-services/')) {
			const id = url.pathname.split('/').pop() ?? '';
			const result = options.onUpdate?.(
				id,
				request.postDataJSON() as Record<string, unknown>,
			) ?? { status: 500, body: { detail: 'Não esperado' } };
			return fulfill(result);
		}

		if (
			url.pathname === '/api/quotes/quote-1' &&
			request.method() === 'PATCH'
		) {
			quoteUpdates.push(request.postDataJSON());
			return fulfill({ status: 200, body: QUOTE });
		}

		if (url.pathname === '/api/quotes') {
			return fulfill({
				status: 200,
				body: {
					items: [QUOTE],
					total: 1,
					page: 1,
					page_size: 10,
					total_pages: 1,
				},
			});
		}

		return fulfill({ status: 200, body: [] });
	});

	return { quoteUpdates };
}

async function openQuote(page: Page) {
	await loginAs(page);
	await page.goto('/orcamento', { waitUntil: 'domcontentloaded' });
	await page.getByLabel('Expandir orçamento QUOTE-1').click();
}

test.describe('Serviços adicionais no orçamento', () => {
	test('lista os serviços adicionais do orçamento', async ({ page }) => {
		let requestedQuoteId: string | null = null;
		page.on('request', (request) => {
			const url = new URL(request.url());
			if (url.pathname === '/api/quotes/additional-services') {
				requestedQuoteId = url.searchParams.get('quote_id');
			}
		});
		await mockQuotesApi(page, { services: [FIRST_SERVICE, SECOND_SERVICE] });

		await openQuote(page);

		await expect(page.getByText('Serviços adicionais (2)')).toBeVisible();
		await expect(page.getByText('Diagramação')).toBeVisible();
		await expect(page.getByText('Revisão técnica')).toBeVisible();
		await expect(page.getByText('R$ 100,00')).toBeVisible();
		await expect(page.getByText('R$ 150,00')).toBeVisible();
		await expect(page.getByText('Concluído', { exact: true })).toBeVisible();
		expect(requestedQuoteId).toBe('quote-1');
	});

	test('exibe estado vazio quando o orçamento não possui serviços adicionais', async ({
		page,
	}) => {
		await mockQuotesApi(page, { services: [] });

		await openQuote(page);

		await expect(page.getByText('Serviços adicionais (0)')).toBeVisible();
		await expect(
			page.getByText('Este orçamento ainda não possui serviços adicionais.'),
		).toBeVisible();
	});

	test('cadastra um novo serviço adicional vinculado ao orçamento', async ({
		page,
	}) => {
		let sentBody: Record<string, unknown> | undefined;
		await mockQuotesApi(page, {
			services: [],
			onCreate: (body) => {
				sentBody = body;
				return {
					status: 201,
					body: {
						...FIRST_SERVICE,
						description: body.description,
						price: '150.00',
					},
				};
			},
		});

		await openQuote(page);
		await page.getByText('Novo serviço adicional', { exact: true }).click();
		await expect(
			page.getByLabel('Confirmar cadastro do serviço adicional'),
		).toBeVisible();

		await page
			.getByPlaceholder('Ex: Revisão técnica')
			.fill('Tradução juramentada');
		await page.getByPlaceholder('R$ 0,00').fill('15000');
		await page.getByLabel('Confirmar cadastro do serviço adicional').click();

		await expect.poll(() => sentBody).toBeDefined();
		expect(sentBody).toEqual({
			description: 'Tradução juramentada',
			price: 150,
			quote_id: 'quote-1',
		});
		await expect(
			page.getByLabel('Confirmar cadastro do serviço adicional'),
		).not.toBeVisible();
		await expect(page.getByText('Serviços adicionais (1)')).toBeVisible();
		await expect(page.getByText('Tradução juramentada')).toBeVisible();
	});

	test('valida os campos obrigatórios do cadastro sem chamar a API', async ({
		page,
	}) => {
		let createCalls = 0;
		await mockQuotesApi(page, {
			services: [],
			onCreate: () => {
				createCalls += 1;
				return { status: 201, body: FIRST_SERVICE };
			},
		});

		await openQuote(page);
		await page.getByText('Novo serviço adicional', { exact: true }).click();
		await page.getByLabel('Confirmar cadastro do serviço adicional').click();
		await expect(
			page.getByText('Informe a descrição do serviço adicional.'),
		).toBeVisible();

		await page.getByPlaceholder('Ex: Revisão técnica').fill('Revisão');
		await page.getByLabel('Confirmar cadastro do serviço adicional').click();
		await expect(
			page.getByText('Informe o valor do serviço adicional.'),
		).toBeVisible();
		expect(createCalls).toBe(0);
	});

	test('mantém o modal aberto e exibe o erro quando a descrição já existe', async ({
		page,
	}) => {
		await mockQuotesApi(page, {
			services: [FIRST_SERVICE],
			onCreate: () => ({
				status: 409,
				body: {
					detail:
						'Já existe um serviço adicional com essa descrição neste orçamento',
				},
			}),
		});

		await openQuote(page);
		await page.getByText('Novo serviço adicional', { exact: true }).click();
		await page.getByPlaceholder('Ex: Revisão técnica').fill('Diagramação');
		await page.getByPlaceholder('R$ 0,00').fill('10000');
		await page.getByLabel('Confirmar cadastro do serviço adicional').click();

		await expect(
			page.getByText(
				'Já existe um serviço adicional com essa descrição neste orçamento',
			),
		).toBeVisible();
		await expect(
			page.getByLabel('Confirmar cadastro do serviço adicional'),
		).toBeVisible();
		await expect(page.getByText('Serviços adicionais (1)')).toBeVisible();
	});

	test('edita os serviços adicionais junto com o orçamento e envia apenas os alterados', async ({
		page,
	}) => {
		const updates: { id: string; body: Record<string, unknown> }[] = [];
		const { quoteUpdates } = await mockQuotesApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
			onUpdate: (id, body) => {
				updates.push({ id, body });
				return {
					status: 200,
					body: {
						...FIRST_SERVICE,
						description: body.description,
						price: Number(body.price).toFixed(2),
					},
				};
			},
		});

		await openQuote(page);
		await expect(page.getByText('Serviços adicionais (2)')).toBeVisible();
		await page.getByLabel('Editar orçamento').click();

		await expect(page.getByText('Novo serviço adicional')).toHaveCount(0);
		await page
			.locator('input[value="Diagramação"]')
			.fill('Diagramação bilíngue');
		await page.getByPlaceholder('R$ 0,00').first().fill('12000');
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect.poll(() => quoteUpdates.length).toBe(1);
		await expect.poll(() => updates.length).toBe(1);
		expect(updates[0]).toEqual({
			id: 'service-1',
			body: { description: 'Diagramação bilíngue', price: 120 },
		});
		await expect(page.getByText('Diagramação bilíngue')).toBeVisible();
		await expect(page.getByText('R$ 120,00')).toBeVisible();
		await expect(page.getByText('Revisão técnica')).toBeVisible();
		await expect(page.getByLabel('Editar orçamento')).toBeVisible();
	});

	test('não salva o orçamento quando um serviço adicional fica sem descrição', async ({
		page,
	}) => {
		const updates: string[] = [];
		const { quoteUpdates } = await mockQuotesApi(page, {
			services: [FIRST_SERVICE],
			onUpdate: (id) => {
				updates.push(id);
				return { status: 200, body: FIRST_SERVICE };
			},
		});

		await openQuote(page);
		await expect(page.getByText('Serviços adicionais (1)')).toBeVisible();
		await page.getByLabel('Editar orçamento').click();
		await page.locator('input[value="Diagramação"]').fill('');
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect(
			page.getByText(
				'Informe a descrição e o valor de todos os serviços adicionais.',
			),
		).toBeVisible();
		expect(quoteUpdates).toHaveLength(0);
		expect(updates).toHaveLength(0);
	});

	test('mantém a edição aberta e exibe o erro quando a atualização do serviço falha', async ({
		page,
	}) => {
		await mockQuotesApi(page, {
			services: [FIRST_SERVICE, SECOND_SERVICE],
			onUpdate: () => ({
				status: 409,
				body: {
					detail:
						'Já existe um serviço adicional com essa descrição neste orçamento',
				},
			}),
		});

		await openQuote(page);
		await expect(page.getByText('Serviços adicionais (2)')).toBeVisible();
		await page.getByLabel('Editar orçamento').click();
		await page.locator('input[value="Diagramação"]').fill('Revisão técnica');
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect(
			page.getByText(
				'Já existe um serviço adicional com essa descrição neste orçamento',
			),
		).toBeVisible();
		await expect(
			page.getByText('Salvar alterações', { exact: true }),
		).toBeVisible();
	});
});
