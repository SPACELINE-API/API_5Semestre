import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const quoteId = 'quote-lifecycle';

function makeQuote(overrides: Record<string, unknown> = {}) {
	return {
		id: quoteId,
		request_id: null,
		company_id: 'company-1',
		contact_id: null,
		status: 'draft',
		approved_at: null,
		approved_by_email: null,
		reproved_at: null,
		reproved_by_email: null,
		reproval_reason: null,
		service_order_id: null,
		total_value: 120,
		customer_name: 'Cliente de teste',
		enterprise: 'Empresa de teste',
		email: 'cliente@teste.com',
		original_language: 'pt-BR',
		translation_language: 'en-US',
		customer_need: 'Contrato',
		created_at: '2026-10-25T12:00:00Z',
		updated_at: '2026-10-25T12:00:00Z',
		items: [
			{
				id: 'quote-item-1',
				quote_id: quoteId,
				source_language: 'pt-BR',
				target_language: 'en-US',
				document_type: 'Contrato',
				file_url: 'https://files.example/contrato.pdf',
				estimated_value: 120,
				created_at: '2026-10-25T12:00:00Z',
				updated_at: '2026-10-25T12:00:00Z',
			},
		],
		...overrides,
	};
}

async function mockQuotes(
	page: Page,
	quote: ReturnType<typeof makeQuote>,
	statusFilters: string[] = [],
) {
	await page.route('**/api/quotes?**', (route) => {
		const status = new URL(route.request().url()).searchParams.get('status');
		if (status) statusFilters.push(status);
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: [quote],
				total: 1,
				page: 1,
				page_size: 10,
				total_pages: 1,
			}),
		});
	});
	await page.route('**/api/quotes/additional-services?**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: '[]',
		}),
	);
	await page.route('**/api/service-orders/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ id: 'order-1', items: [], files: [] }),
		}),
	);
}

async function openQuote(page: Page) {
	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).click();
}

test('orçamento em preparação pode ser editado e enviado ao cliente', async ({
	page,
}) => {
	await loginAs(page);
	await mockQuotes(page, makeQuote());
	let sendCalls = 0;
	await page.route(`**/api/quotes/${quoteId}/send`, (route) => {
		sendCalls += 1;
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(makeQuote({ status: 'pending' })),
		});
	});

	await openQuote(page);
	await expect(page.getByText('Em preparação').first()).toBeVisible();
	await expect(page.getByLabel('Editar orçamento')).toBeVisible();
	await expect(page.getByText('Novo serviço adicional')).toBeVisible();

	await page.getByText('Enviar ao cliente', { exact: true }).click();

	await expect(
		page.getByText('Orçamento enviado ao cliente para aprovação.'),
	).toBeVisible();
	await expect(page.getByText('Aguardando aprovação').first()).toBeVisible();
	await expect(page.getByLabel('Editar orçamento')).toHaveCount(0);
	await expect(page.getByText('Novo serviço adicional')).toHaveCount(0);
	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toBeVisible();
	expect(sendCalls).toBe(1);
});

for (const status of ['pending', 'approved', 'reproved', 'cancelled']) {
	test(`orçamento com status ${status} fica bloqueado para edição`, async ({
		page,
	}) => {
		await loginAs(page);
		await mockQuotes(page, makeQuote({ status }));

		await openQuote(page);

		await expect(
			page.getByText(
				/bloqueado para edição|aguardando aprovação\. Reabra|prazo de validade de 30 dias expirou/,
			),
		).toBeVisible();
		await expect(page.getByLabel('Editar orçamento')).toHaveCount(0);
		await expect(page.getByText('Novo serviço adicional')).toHaveCount(0);
		await expect(
			page.getByText('Enviar ao cliente', { exact: true }),
		).toHaveCount(0);
	});
}

test('aprovar e reprovar só aparecem para orçamento aguardando aprovação', async ({
	page,
}) => {
	await loginAs(page);
	await mockQuotes(page, makeQuote({ status: 'draft' }));

	await openQuote(page);

	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toHaveCount(0);
	await expect(
		page.getByText('Reprovar orçamento', { exact: true }),
	).toHaveCount(0);
});

test('filtros exibem os novos status do orçamento', async ({ page }) => {
	await loginAs(page);
	const statusFilters: string[] = [];
	await mockQuotes(page, makeQuote(), statusFilters);

	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).waitFor();
	await page
		.getByRole('button', { name: /filtro/i })
		.first()
		.click();

	await expect(
		page.getByText('Em preparação', { exact: true }).last(),
	).toBeVisible();
	await expect(
		page.getByText('Aguardando aprovação', { exact: true }),
	).toBeVisible();
	await expect(page.getByText('Cancelados', { exact: true })).toBeVisible();

	await page.getByText('Cancelados', { exact: true }).click();
	await expect.poll(() => statusFilters).toContain('cancelled');
});

for (const status of ['pending', 'approved', 'reproved']) {
	test(`botão de reabrir aparece para ${status} com permissão`, async ({
		page,
	}) => {
		await loginAs(page, { extraPermissions: ['quotes.reopen'] });
		await mockQuotes(page, makeQuote({ status }));

		await openQuote(page);

		await expect(
			page.getByRole('button', { name: /Reabrir orçamento/ }),
		).toBeVisible();
	});
}

for (const status of ['draft', 'cancelled']) {
	test(`botão de reabrir não aparece para ${status}`, async ({ page }) => {
		await loginAs(page, { extraPermissions: ['quotes.reopen'] });
		await mockQuotes(page, makeQuote({ status }));

		await openQuote(page);

		await expect(
			page.getByRole('button', { name: /Reabrir orçamento/ }),
		).toHaveCount(0);
	});
}

test('botão de reabrir não aparece sem a permissão', async ({ page }) => {
	await loginAs(page);
	await mockQuotes(page, makeQuote({ status: 'approved' }));

	await openQuote(page);

	await expect(
		page.getByRole('button', { name: /Reabrir orçamento/ }),
	).toHaveCount(0);
});

test('reabre o orçamento informando o motivo', async ({ page }) => {
	await loginAs(page, { extraPermissions: ['quotes.reopen'] });
	await mockQuotes(
		page,
		makeQuote({ status: 'approved', service_order_id: 'order-1' }),
	);
	const reopenBodies: unknown[] = [];
	await page.route(`**/api/quotes/${quoteId}/reopen`, (route) => {
		reopenBodies.push(route.request().postDataJSON());
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				makeQuote({ status: 'draft', service_order_id: 'order-1' }),
			),
		});
	});

	await openQuote(page);
	await page.getByRole('button', { name: /Reabrir orçamento/ }).click();
	await page.getByText('Confirmar reabertura', { exact: true }).click();
	await expect(page.getByText('Informe o motivo da reabertura.')).toBeVisible();
	expect(reopenBodies).toHaveLength(0);

	await page
		.getByLabel('Motivo da reabertura')
		.fill('Cliente enviou um novo documento');
	await page.getByText('Confirmar reabertura', { exact: true }).click();

	await expect(
		page.getByText(
			'Orçamento reaberto. Ele está em preparação e pode ser alterado.',
		),
	).toBeVisible();
	expect(reopenBodies).toEqual([
		{ reason: 'Cliente enviou um novo documento' },
	]);
	await expect(page.getByLabel('Editar orçamento')).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Abrir ordem de serviço do orçamento/ }),
	).toBeVisible();
});

test('exibe o erro da API quando a reabertura falha', async ({ page }) => {
	await loginAs(page, { extraPermissions: ['quotes.reopen'] });
	await mockQuotes(page, makeQuote({ status: 'approved' }));
	await page.route(`**/api/quotes/${quoteId}/reopen`, (route) =>
		route.fulfill({
			status: 409,
			contentType: 'application/json',
			body: JSON.stringify({
				detail:
					'Orçamentos cancelados não podem ser reabertos. Somente orçamentos aguardando aprovação, aprovados ou reprovados podem ser reabertos.',
			}),
		}),
	);

	await openQuote(page);
	await page.getByRole('button', { name: /Reabrir orçamento/ }).click();
	await page.getByLabel('Motivo da reabertura').fill('Ajuste');
	await page.getByText('Confirmar reabertura', { exact: true }).click();

	await expect(
		page.getByText(/Orçamentos cancelados não podem ser reabertos/),
	).toBeVisible();
	await expect(page.getByText('Confirmar reabertura')).toBeVisible();
});

for (const status of ['draft', 'pending']) {
	test(`exibe a validade do orçamento ${status}`, async ({ page }) => {
		await loginAs(page);
		await mockQuotes(
			page,
			makeQuote({ status, valid_until: '2026-11-24T15:00:00Z' }),
		);

		await page.goto('/orcamento');

		await expect(page.getByText('Válido até 24/11/2026')).toBeVisible();
	});
}

test('não exibe a validade de orçamento aprovado', async ({ page }) => {
	await loginAs(page);
	await mockQuotes(
		page,
		makeQuote({ status: 'approved', valid_until: '2026-11-24T15:00:00Z' }),
	);

	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).waitFor();

	await expect(page.getByText(/Válido até/)).toHaveCount(0);
});

test('orçamento cancelado informa que a validade expirou', async ({ page }) => {
	await loginAs(page);
	await mockQuotes(page, makeQuote({ status: 'cancelled' }));

	await openQuote(page);

	await expect(
		page.getByText(/prazo de validade de 30 dias expirou/),
	).toBeVisible();
	await expect(page.getByText('Cancelado').first()).toBeVisible();
});
