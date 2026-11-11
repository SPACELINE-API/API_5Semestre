import { expect, test, type Page } from '@playwright/test';

const token = 'token-do-cliente';

function makeCustomerQuote(overrides: Record<string, unknown> = {}) {
	return {
		code: 'ABC12345',
		status: 'pending',
		company_name: 'Empresa de teste',
		customer_name: 'Maria',
		items: [
			{
				document_type: 'Contrato',
				source_language: 'pt-BR',
				target_language: 'en-US',
				estimated_value: '100.00',
			},
		],
		additional_services: [{ description: 'Revisão', price: '20.00' }],
		total_value: '120.00',
		valid_until: '2026-12-10T15:00:00Z',
		sent_to_customer_at: '2026-11-10T15:00:00Z',
		approved_at: null,
		reproved_at: null,
		reproval_reason: null,
		...overrides,
	};
}

async function mockCustomerQuote(
	page: Page,
	quote: ReturnType<typeof makeCustomerQuote> | null,
	decisions: unknown[] = [],
) {
	await page.route(`**/api/public/quotes/${token}`, (route) =>
		quote
			? route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(quote),
				})
			: route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ detail: 'Link inválido' }),
				}),
	);
	await page.route(`**/api/public/quotes/${token}/decision`, (route) => {
		const body = route.request().postDataJSON() as {
			status: string;
			reproval_reason?: string;
		};
		decisions.push(body);
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(
				makeCustomerQuote(
					body.status === 'approved'
						? { status: 'approved', approved_at: '2026-11-11T15:00:00Z' }
						: {
								status: 'reproved',
								reproved_at: '2026-11-11T15:00:00Z',
								reproval_reason: body.reproval_reason,
							},
				),
			),
		});
	});
}

test('cliente vê o orçamento pelo link sem fazer login', async ({ page }) => {
	await mockCustomerQuote(page, makeCustomerQuote());

	await page.goto(`/aprovar-orcamento?token=${token}`);

	await expect(page.getByText('Orçamento #ABC12345')).toBeVisible();
	await expect(page.getByText('Contrato')).toBeVisible();
	await expect(page.getByText('Revisão')).toBeVisible();
	await expect(page.getByText(/R\$\s*120,00/)).toBeVisible();
	await expect(page.getByText(/Válido até 10\/12\/2026/)).toBeVisible();
	await expect(page).toHaveURL(/aprovar-orcamento/);
});

test('cliente aprova o orçamento', async ({ page }) => {
	const decisions: unknown[] = [];
	await mockCustomerQuote(page, makeCustomerQuote(), decisions);

	await page.goto(`/aprovar-orcamento?token=${token}`);
	await page.getByText('Aprovar orçamento', { exact: true }).click();
	await expect(
		page.getByText(/Confirma a aprovação do orçamento #ABC12345/),
	).toBeVisible();
	expect(decisions).toHaveLength(0);
	await page.getByText('Confirmar aprovação', { exact: true }).click();

	await expect(page.getByText(/Orçamento aprovado em/)).toBeVisible();
	await expect(
		page.getByText(/comprovante comercial por e-mail/),
	).toBeVisible();
	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toHaveCount(0);
	expect(decisions).toEqual([{ status: 'approved' }]);
});

test('cliente reprova o orçamento informando o motivo', async ({ page }) => {
	const decisions: unknown[] = [];
	await mockCustomerQuote(page, makeCustomerQuote(), decisions);

	await page.goto(`/aprovar-orcamento?token=${token}`);
	await page.getByText('Reprovar orçamento', { exact: true }).click();
	await page.getByText('Confirmar reprovação', { exact: true }).click();
	await expect(page.getByText('Informe o motivo da reprovação.')).toBeVisible();
	expect(decisions).toHaveLength(0);

	await page.getByLabel('Motivo da reprovação').fill('Valor acima do previsto');
	await page.getByText('Confirmar reprovação', { exact: true }).click();

	await expect(page.getByText(/Orçamento reprovado em/)).toBeVisible();
	await expect(page.getByText(/Valor acima do previsto/)).toBeVisible();
	expect(decisions).toEqual([
		{ status: 'reproved', reproval_reason: 'Valor acima do previsto' },
	]);
});

test('link inválido ou substituído mostra aviso', async ({ page }) => {
	await mockCustomerQuote(page, null);

	await page.goto(`/aprovar-orcamento?token=${token}`);

	await expect(page.getByText('Link inválido')).toBeVisible();
	await expect(page.getByText(/link do e-mail mais recente/)).toBeVisible();
});

test('orçamento expirado não pode ser respondido', async ({ page }) => {
	await mockCustomerQuote(page, makeCustomerQuote({ status: 'cancelled' }));

	await page.goto(`/aprovar-orcamento?token=${token}`);

	await expect(
		page.getByText(/prazo de validade deste orçamento expirou/),
	).toBeVisible();
	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toHaveCount(0);
});

test('cliente pode voltar sem aprovar', async ({ page }) => {
	const decisions: unknown[] = [];
	await mockCustomerQuote(page, makeCustomerQuote(), decisions);

	await page.goto(`/aprovar-orcamento?token=${token}`);
	await page.getByText('Aprovar orçamento', { exact: true }).click();
	await page.getByText('Voltar', { exact: true }).click();

	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toBeVisible();
	expect(decisions).toHaveLength(0);
});

test('permite tentar de novo quando o carregamento falha', async ({ page }) => {
	let calls = 0;
	await page.route(`**/api/public/quotes/${token}`, (route) => {
		calls += 1;
		return calls === 1
			? route.fulfill({ status: 500, body: '{}' })
			: route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(makeCustomerQuote()),
				});
	});

	await page.goto(`/aprovar-orcamento?token=${token}`);
	await expect(
		page.getByText(/Não foi possível carregar o orçamento/),
	).toBeVisible();
	await page.getByText('Tentar novamente', { exact: true }).click();

	await expect(page.getByText('Orçamento #ABC12345')).toBeVisible();
});
