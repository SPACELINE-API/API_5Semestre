import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contratos comerciais',
	deadline: '2026-12-01T00:00:00Z',
	status: 'pendente',
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

function pendingInvite() {
	return {
		id: 'invite-1',
		service_order_item_id: 'item-1',
		translator_id: 'translator-1',
		status: 'pendente',
		sent_at: '2026-01-02T00:00:00Z',
		responded_at: null,
	};
}

test.describe('Invite details page', () => {
	test('accepts an invite and redirects to the invites list', async ({
		page,
	}) => {
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([pendingInvite()]),
			});
		});
		await page.route('**/api/service-orders', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([SERVICE_ORDER]),
			});
		});
		await page.route(
			'**/api/service-orders/invites/invite-1/accept',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						...pendingInvite(),
						status: 'aceito',
						responded_at: '2026-01-03T00:00:00Z',
					}),
				});
			},
		);

		await loginAs(page);
		await page.goto('/convites/invite-1');

		await expect(page.getByText('Português → Inglês')).toBeVisible();

		await page.getByLabel('Aceitar convite').click();

		await expect(page.getByText('Convite aceito com sucesso!')).toBeVisible();
		await expect(page).toHaveURL(/\/convites$/);
	});

	test('declines an invite and redirects to the invites list', async ({
		page,
	}) => {
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([pendingInvite()]),
			});
		});
		await page.route('**/api/service-orders', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([SERVICE_ORDER]),
			});
		});
		await page.route(
			'**/api/service-orders/invites/invite-1/decline',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						...pendingInvite(),
						status: 'recusado',
						responded_at: '2026-01-03T00:00:00Z',
					}),
				});
			},
		);

		await loginAs(page);
		await page.goto('/convites/invite-1');

		await page.getByLabel('Recusar convite').click();

		await expect(page.getByText('Convite recusado.')).toBeVisible();
		await expect(page).toHaveURL(/\/convites$/);
	});

	test('disables actions when the invite was already responded', async ({
		page,
	}) => {
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						...pendingInvite(),
						status: 'expirado',
						responded_at: '2026-01-03T00:00:00Z',
					},
				]),
			});
		});
		await page.route('**/api/service-orders', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([SERVICE_ORDER]),
			});
		});

		await loginAs(page);
		await page.goto('/convites/invite-1');

		await expect(page.getByLabel('Aceitar convite')).toHaveCount(0);
		await expect(page.getByLabel('Recusar convite')).toHaveCount(0);
		await expect(
			page.getByText(
				'Este convite já foi respondido e não pode mais ser alterado.',
			),
		).toBeVisible();
	});
});
