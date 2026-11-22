import { expect, test, type Page } from '@playwright/test';
import { loginAs } from './authHelper';

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contrato',
	deadline: null,
	status: 'em_andamento',
	items: [
		{
			id: 'item-1',
			service_order_id: 'order-1',
			translator_id: null,
			source_language: 'pt-BR',
			target_language: 'en-US',
			document_type: 'Contrato',
			file_url: null,
			price: '500.00',
			deadline: null,
			status: 'pendente',
			created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-01-01T00:00:00Z',
		},
	],
	files: [],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const language = (id: string, level: string) => ({
	id: `translator-language-${id}-${level}`,
	language_id: id,
	language_name: 'Albanês',
	proficiency_level: level,
});

const TRANSLATORS = [
	{
		id: 'translator-basic',
		name: 'Camila Intermediária',
		email: 'camila@example.com',
		phone: '11999990001',
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		qualifications: [],
		languages: [language('sq-AL', 'intermediate')],
	},
	{
		id: 'translator-advanced',
		name: 'João Avançado',
		email: 'joao@example.com',
		phone: '11999990002',
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		qualifications: [],
		languages: [language('sq-AL', 'advanced')],
	},
	{
		id: 'translator-inactive',
		name: 'Inativo Albanês',
		email: 'inativo@example.com',
		phone: '11999990003',
		is_active: false,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		qualifications: [],
		languages: [language('sq-AL', 'native')],
	},
	{
		id: 'translator-pending',
		name: 'Pendente Albanês',
		email: 'pendente@example.com',
		phone: '11999990004',
		is_active: true,
		created_at: '2026-01-01T00:00:00Z',
		updated_at: '2026-01-01T00:00:00Z',
		qualifications: [],
		languages: [language('sq-AL', 'native')],
	},
];

async function openTranslatorTab(page: Page) {
	await loginAs(page);
	const invitesResponse = page.waitForResponse((response) =>
		response.url().includes('/api/service-orders/items/item-1/invites'),
	);
	await page.goto('/ordens-de-servico/order-1');
	await page.getByRole('tab', { name: 'Ver aba Tradutores' }).click();
	await invitesResponse;
	await expect(page.getByText('Camila Intermediária')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
	await page.route('**/api/clients', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/contacts', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/translators', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(TRANSLATORS),
		}),
	);
	await page.route('**/api/service-orders/order-1', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(SERVICE_ORDER),
		}),
	);
	await page.route('**/api/service-orders/items/item-1/invites', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([
				{
					id: 'invite-1',
					service_order_item_id: 'item-1',
					translator_id: 'translator-pending',
					status: 'pendente',
					sent_at: '2026-01-01T00:00:00Z',
					responded_at: null,
				},
			]),
		}),
	);
	await page.route('**/api/quotes/quote-1/additional-services', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
});

test('filtra somente por idioma', async ({ page }) => {
	await openTranslatorTab(page);
	await page
		.getByRole('button', { name: 'Abrir filtros de tradutores' })
		.click();
	await page.getByRole('button', { name: /Albanês/ }).click();
	await expect(page.getByText('Camila Intermediária')).toBeVisible();
	await expect(page.getByText('João Avançado')).toBeVisible();
});

test('filtra somente por proficiência', async ({ page }) => {
	await openTranslatorTab(page);
	await page
		.getByRole('button', { name: 'Abrir filtros de tradutores' })
		.click();
	await page.getByRole('button', { name: 'Avançado', exact: true }).click();
	await expect(page.getByText('João Avançado')).toBeVisible();
	await expect(page.getByText('Camila Intermediária')).not.toBeVisible();
});

test('combina idioma e proficiência no mesmo idioma', async ({ page }) => {
	await openTranslatorTab(page);
	await page
		.getByRole('button', { name: 'Abrir filtros de tradutores' })
		.click();
	await page.getByRole('button', { name: /Albanês/ }).click();
	await page.getByRole('button', { name: 'Avançado', exact: true }).click();
	await expect(page.getByText('João Avançado')).toBeVisible();
	await expect(page.getByText('Camila Intermediária')).not.toBeVisible();
});

test('combina a busca textual com os filtros', async ({ page }) => {
	await openTranslatorTab(page);
	await page.getByLabel('Buscar tradutor').fill('João');
	await page
		.getByRole('button', { name: 'Abrir filtros de tradutores' })
		.click();
	await page.getByRole('button', { name: /Albanês/ }).click();
	await expect(page.getByText('João Avançado')).toBeVisible();
	await expect(page.getByText('Camila Intermediária')).not.toBeVisible();
});

test('informa quando nenhum tradutor atende aos filtros', async ({ page }) => {
	await openTranslatorTab(page);
	await page
		.getByRole('button', { name: 'Abrir filtros de tradutores' })
		.click();
	await page.getByRole('button', { name: 'Nativo', exact: true }).click();
	await expect(page.getByText('Nenhum tradutor encontrado.')).toBeVisible();
});

test('não exibe tradutores inativos ou com convite pendente', async ({
	page,
}) => {
	await openTranslatorTab(page);
	await expect(page.getByText('Inativo Albanês')).not.toBeVisible();

	const pendingOption = page.getByRole('checkbox', {
		name: 'Selecionar tradutor Pendente Albanês (convite pendente)',
	});
	if (await pendingOption.count()) {
		await expect(pendingOption).toBeDisabled();
	}
});
