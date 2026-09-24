import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';
import type { ServiceOrderItem } from '../../types/serviceOrder';

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

const TRANSLATOR = {
	id: 'translator-1',
	name: 'Maria Tradutora',
	email: 'maria.tradutora@example.com',
	phone: '11999999999',
	is_active: true,
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
	qualifications: [],
	language_pairs: [],
};

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contratos comerciais',
	deadline: '2026-12-01T00:00:00Z',
	domain_area: null,
	price_category: null,
	internal_notes: null,
	external_notes: null,
	status: 'pendente',
	files: [],
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
			word_count: null,
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

test.describe('Service order details', () => {
	test('renders order items and lets staff send invites', async ({ page }) => {
		let inviteRequestBody: Record<string, unknown> = {};

		await page.route('**/api/clients', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([COMPANY]),
			});
		});
		await page.route('**/api/translators*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					items: [TRANSLATOR],
					total: 1,
					page: 1,
					page_size: 100,
				}),
			});
		});
		await page.route('**/api/service-orders/order-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(SERVICE_ORDER),
			});
		});
		await page.route(
			'**/api/service-orders/items/item-1/invites',
			async (route) => {
				if (route.request().method() === 'POST') {
					inviteRequestBody = route.request().postDataJSON() as Record<
						string,
						unknown
					>;
					await route.fulfill({
						status: 201,
						contentType: 'application/json',
						body: JSON.stringify([
							{
								id: 'invite-1',
								service_order_item_id: 'item-1',
								translator_id: 'translator-1',
								status: 'pendente',
								sent_at: '2026-01-02T00:00:00Z',
								responded_at: null,
							},
						]),
					});
					return;
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify([]),
				});
			},
		);

		await loginAs(page);
		await page.goto('/ordens-de-servico/order-1');

		await expect(
			page.getByText('Tradução de contratos comerciais'),
		).toBeVisible();

		await page.getByLabel('Ver aba Equipe').click();
		await expect(page.getByText('Português → Inglês')).toBeVisible();

		await page
			.getByLabel('Convidar tradutores para Português para Inglês')
			.click();
		await page.getByLabel('Selecionar tradutor Maria Tradutora').click();
		await page.getByText('Enviar convites').click();

		await expect(
			page.getByText('Convites enviados com sucesso!'),
		).toBeVisible();
		expect(inviteRequestBody).toMatchObject({
			translator_ids: ['translator-1'],
		});
	});

	test('lets staff add and edit an item', async ({ page }) => {
		let currentItems: ServiceOrderItem[] = SERVICE_ORDER.items.map((item) => ({
			...item,
			status: item.status as ServiceOrderItem['status'],
		}));
		let addItemMethod = '';
		let updateItemMethod = '';

		await page.route('**/api/clients', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([COMPANY]),
			});
		});
		await page.route('**/api/translators*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					items: [TRANSLATOR],
					total: 1,
					page: 1,
					page_size: 100,
				}),
			});
		});
		await page.route('**/api/service-orders/order-1', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ...SERVICE_ORDER, items: currentItems }),
			});
		});
		await page.route('**/api/service-orders/order-1/items', async (route) => {
			addItemMethod = route.request().method();
			const newItem: ServiceOrderItem = {
				id: 'item-2',
				service_order_id: 'order-1',
				quote_translation_item_id: null,
				translator_id: null,
				source_language: 'Espanhol',
				target_language: 'Português',
				document_type: null,
				file_url: null,
				word_count: 800,
				price: null,
				deadline: null,
				status: 'pendente',
				created_at: '2026-01-03T00:00:00Z',
				updated_at: '2026-01-03T00:00:00Z',
			};
			currentItems = [...currentItems, newItem];
			await route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify(newItem),
			});
		});
		await page.route('**/api/service-orders/items/item-1', async (route) => {
			updateItemMethod = route.request().method();
			const updatedFirstItem = {
				...currentItems[0],
				document_type: 'Contrato revisado',
			};
			currentItems = [updatedFirstItem, ...currentItems.slice(1)];
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(updatedFirstItem),
			});
		});
		await page.route('**/api/service-orders/items/*/invites', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([]),
			});
		});

		await loginAs(page);
		await page.goto('/ordens-de-servico/order-1');

		await page.getByLabel('Ver aba Itens').click();
		await page.getByLabel('Adicionar item').click();
		await page.getByPlaceholder('Ex: Português').fill('Espanhol');
		await page.getByPlaceholder('Ex: Inglês').fill('Português');
		await page.getByLabel('Confirmar adição do item').click();

		await expect(page.getByText('Item adicionado com sucesso!')).toBeVisible();
		expect(addItemMethod).toBe('POST');
		await expect(page.getByText('Espanhol → Português')).toBeVisible();

		await page.getByLabel('Editar item de Português para Inglês').click();
		await expect(page.getByText('Editar item')).toBeVisible();
		await page.getByPlaceholder('Ex: Contrato').fill('Contrato revisado');
		await page.getByLabel('Confirmar edição do item').click();

		await expect(page.getByText('Item atualizado com sucesso!')).toBeVisible();
		expect(updateItemMethod).toBe('PATCH');
	});
});
