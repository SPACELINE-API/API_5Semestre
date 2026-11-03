import { expect, test } from '@playwright/test';
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
		languages: [
			{
				id: 'translator-language-1',
				language_id: 'sq-AL',
				language_name: 'Albanês',
				proficiency_level: 'intermediate',
			},
		],
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
		languages: [
			{
				id: 'translator-language-2',
				language_id: 'sq-AL',
				language_name: 'Albanês',
				proficiency_level: 'advanced',
			},
		],
	},
];

test('combina idioma e proficiência no mesmo idioma', async ({ page }) => {
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
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/quotes/quote-1/additional-services', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);

	await loginAs(page);
	await page.goto('/ordens-de-servico/order-1');
	await page.getByRole('tab', { name: 'Ver aba Tradutores' }).click();

	await expect(page.getByText('Camila Intermediária')).toBeVisible();
	await expect(page.getByText('João Avançado')).toBeVisible();

	await page.getByRole('button', { name: 'Abrir filtros de tradutores' }).click();
	await page.getByRole('button', { name: 'Albanês', exact: true }).click();
	await page.getByRole('button', { name: 'Avançado', exact: true }).click();

	await expect(page.getByText('João Avançado')).toBeVisible();
	await expect(page.getByText('Camila Intermediária')).not.toBeVisible();
});
