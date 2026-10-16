import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

function inviteDetails(overrides: Record<string, unknown> = {}) {
	return {
		id: 'invite-1',
		service_order_item_id: 'item-1',
		translator_id: 'translator-1',
		status: 'pendente',
		sent_at: '2026-01-02T00:00:00Z',
		responded_at: null,
		item: {
			id: 'item-1',
			source_language: 'Português',
			target_language: 'Inglês',
			document_type: 'Contrato',
			deadline: '2026-11-01T00:00:00Z',
			status: 'pendente',
			file_url: null,
			word_count: 1200,
			price: '500.00',
		},
		...overrides,
	};
}

function respondedInvite(status: string) {
	return {
		id: 'invite-1',
		service_order_item_id: 'item-1',
		translator_id: 'translator-1',
		status,
		sent_at: '2026-01-02T00:00:00Z',
		responded_at: '2026-01-03T00:00:00Z',
	};
}

test.describe('Invite details page', () => {
	test('accepts an invite and redirects to the invites list', async ({
		page,
	}) => {
		let acceptRequestSeen = false;
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([inviteDetails()]),
			});
		});
		await page.route(
			'**/api/service-orders/invites/invite-1',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(inviteDetails()),
				});
			},
		);
		await page.route(
			'**/api/service-orders/invites/invite-1/accept',
			async (route) => {
				acceptRequestSeen = route.request().method() === 'POST';
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(respondedInvite('aceito')),
				});
			},
		);

		await loginAs(page);
		await page.goto('/convites/invite-1');

		await expect(page.getByText('Português → Inglês')).toBeVisible();

		await page.getByLabel('Aceitar convite').click();

		await expect(page).toHaveURL(/\/convites$/);
		expect(acceptRequestSeen).toBe(true);
	});

	test('declines an invite and redirects to the invites list', async ({
		page,
	}) => {
		let declineRequestSeen = false;
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([inviteDetails()]),
			});
		});
		await page.route(
			'**/api/service-orders/invites/invite-1',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(inviteDetails()),
				});
			},
		);
		await page.route(
			'**/api/service-orders/invites/invite-1/decline',
			async (route) => {
				declineRequestSeen = route.request().method() === 'POST';
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(respondedInvite('recusado')),
				});
			},
		);

		await loginAs(page);
		await page.goto('/convites/invite-1');

		await page.getByLabel('Recusar convite').click();

		await expect(page).toHaveURL(/\/convites$/);
		expect(declineRequestSeen).toBe(true);
	});

	test('disables actions when the invite was already responded', async ({
		page,
	}) => {
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([inviteDetails({ status: 'expirado' })]),
			});
		});
		await page.route(
			'**/api/service-orders/invites/invite-1',
			async (route) => {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(
						inviteDetails({
							status: 'expirado',
							responded_at: '2026-01-03T00:00:00Z',
						}),
					),
				});
			},
		);

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
