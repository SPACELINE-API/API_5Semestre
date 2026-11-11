import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './authHelper';

const BASE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contrato comercial',
	deadline: '2026-12-01T00:00:00Z',
	domain_area: null,
	price_category: null,
	internal_notes: null,
	external_notes: null,
	status: 'pendente',
	current_version: 1,
	revised_after_reopen: false,
	items: [],
	files: [],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const VERSIONS = [
	{
		id: 'v2',
		version: 2,
		origin: 'quote_reapproval',
		reason: 'Cliente enviou novo documento',
		actor_email: 'maria@acme.com',
		created_at: '2026-11-10T13:00:00Z',
		changes: [
			{
				action: 'updated',
				item: 'Contrato (pt-BR → en-US)',
				fields: {
					target_language: { before: 'en-US', after: 'fr-FR' },
					price: { before: '100.00', after: '150.00' },
				},
			},
			{ action: 'added', item: 'Procuração (pt-BR → es-ES)', fields: {} },
			{ action: 'removed', item: 'Certidão (pt-BR → en-US)', fields: {} },
		],
	},
	{
		id: 'v1',
		version: 1,
		origin: 'quote_approval',
		reason: null,
		actor_email: null,
		created_at: '2026-11-01T13:00:00Z',
		changes: [],
	},
];

async function mockApi(page: Page, order: Record<string, unknown>) {
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
			body: JSON.stringify(order),
		}),
	);
	await page.route('**/api/service-orders/order-1/versions', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(VERSIONS),
		}),
	);
	await page.route(/\/api\/quotes\/additional-services/, (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
}

async function openOrder(page: Page) {
	await loginAs(page);
	await page.goto('/ordens-de-servico/order-1', {
		waitUntil: 'domcontentloaded',
	});
}

test('OS revisada mostra a versão e a indicação de reabertura', async ({
	page,
}) => {
	await mockApi(page, {
		...BASE_ORDER,
		current_version: 2,
		revised_after_reopen: true,
	});

	await openOrder(page);

	await expect(
		page.getByText(/Versão 2 · revisada após reabertura do orçamento/),
	).toBeVisible();
	await expect(page.getByText('Orçamento aprovado')).toBeVisible();
});

test('aba Versões lista o histórico com as alterações', async ({ page }) => {
	await mockApi(page, {
		...BASE_ORDER,
		current_version: 2,
		revised_after_reopen: true,
	});

	await openOrder(page);
	await page.getByRole('tab', { name: 'Ver aba Versões' }).click();

	await expect(page.getByText('Versão 2 (atual)')).toBeVisible();
	await expect(
		page.getByText('Motivo da reabertura: Cliente enviou novo documento'),
	).toBeVisible();
	await expect(page.getByText('Alterado')).toBeVisible();
	await expect(
		page.getByText('Idioma de destino: en-US → fr-FR'),
	).toBeVisible();
	await expect(
		page.getByText(/Valor: R\$\s*100,00 → R\$\s*150,00/),
	).toBeVisible();
	await expect(page.getByText('Adicionado')).toBeVisible();
	await expect(page.getByText('Removido')).toBeVisible();
	await expect(page.getByText('Versão 1', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Criada a partir da aprovação do orçamento.'),
	).toBeVisible();
});

test('OS manual não mostra a aba Versões', async ({ page }) => {
	await mockApi(page, { ...BASE_ORDER, quote_id: null });

	await openOrder(page);

	await expect(page.getByText('Criada manualmente')).toBeVisible();
	await expect(page.getByRole('tab', { name: 'Ver aba Versões' })).toHaveCount(
		0,
	);
});

test('OS sem reabertura não mostra a indicação de revisão', async ({
	page,
}) => {
	await mockApi(page, BASE_ORDER);

	await openOrder(page);

	await expect(page.getByText(/revisada após reabertura/)).toHaveCount(0);
});
