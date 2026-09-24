import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const TRANSLATOR_A = {
	id: '1',
	name: 'Joana Vieira',
	email: 'joana.vieira@spaceline.com.br',
	phone: '11987654321',
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	qualifications: [{ id: 'q1', name: 'Juridico', description: null }],
	language_pairs: [
		{ id: 'lp1', language_pair_id: 'pair-1', proficiency_level: 'fluent' },
	],
};

const TRANSLATOR_B = {
	...TRANSLATOR_A,
	id: '2',
	name: 'Marcos Tanaka',
	email: 'marcos.tanaka@spaceline.com.br',
	is_active: false,
	qualifications: [],
	language_pairs: [],
};

function translatorPage(items: (typeof TRANSLATOR_A)[]) {
	return { items, total: items.length, page: 1, page_size: 100 };
}

test.describe('Translators list (hook + service + apiClient integration)', () => {
	test('loads translators from the API on mount', async ({ page }) => {
		await page.route('**/api/translators*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(translatorPage([TRANSLATOR_A, TRANSLATOR_B])),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');

		await expect(page.getByText('Joana Vieira')).toBeVisible();
		await expect(page.getByText('Marcos Tanaka')).toBeVisible();
	});

	test('shows an error message when the initial load fails', async ({
		page,
	}) => {
		await page.route('**/api/translators*', async (route) => {
			await route.fulfill({
				status: 500,
				contentType: 'application/json',
				body: JSON.stringify({ detail: 'boom' }),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');

		await expect(
			page.getByText('Não foi possível carregar os recursos'),
		).toBeVisible();
	});

	test('shows an empty state when the search has no results', async ({
		page,
	}) => {
		await page.route('**/api/translators*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(translatorPage([])),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');

		await expect(page.getByText('Nenhum recurso encontrado')).toBeVisible();
		await expect(page.getByText('0 resultados')).toBeVisible();
	});
});

test.describe('Translators search filters (language, specialty, availability)', () => {
	test('sends the language filter to the API', async ({ page }) => {
		const requestedUrls: string[] = [];
		await page.route('**/api/translators*', async (route) => {
			requestedUrls.push(route.request().url());
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(translatorPage([TRANSLATOR_A])),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');
		await expect(page.getByText('Joana Vieira')).toBeVisible();

		await page.getByText('Filtros').click();
		await page.getByPlaceholder('Ex: en, pt-BR').fill('en');

		await expect
			.poll(() => requestedUrls.some((url) => url.includes('language=en')))
			.toBe(true);
	});

	test('sends the specialty filter to the API', async ({ page }) => {
		const requestedUrls: string[] = [];
		await page.route('**/api/translators*', async (route) => {
			requestedUrls.push(route.request().url());
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(translatorPage([TRANSLATOR_A])),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');
		await expect(page.getByText('Joana Vieira')).toBeVisible();

		await page.getByText('Filtros').click();
		await page.getByPlaceholder('Ex: Jurídico').fill('Juridico');

		await expect
			.poll(() =>
				requestedUrls.some((url) => url.includes('specialty=Juridico')),
			)
			.toBe(true);
	});

	test('sends the availability filter to the API', async ({ page }) => {
		const requestedUrls: string[] = [];
		await page.route('**/api/translators*', async (route) => {
			requestedUrls.push(route.request().url());
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(translatorPage([TRANSLATOR_A])),
			});
		});

		await loginAs(page);
		await page.goto('/tradutores');
		await expect(page.getByText('Joana Vieira')).toBeVisible();

		await page.getByText('Filtros').click();
		await page.getByLabel('Filtrar por disponibilidade Ativo').click();

		await expect
			.poll(() => requestedUrls.some((url) => url.includes('status=true')))
			.toBe(true);
	});
});
