import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const INVITE = {
	id: 'invite-1',
	service_order_item_id: 'item-1',
	translator_id: 'translator-1',
	status: 'pendente',
	sent_at: '2026-01-02T00:00:00Z',
	responded_at: null,
};

test.describe('My invites list', () => {
	test('redirects to login when there is no session', async ({ page }) => {
		await page.goto('/convites');

		await expect(page).toHaveURL(/\/login/);
	});

	test('loads and lists the logged-in translator invites', async ({ page }) => {
		await page.route('**/api/service-orders/invites/me', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([INVITE]),
			});
		});

		await loginAs(page);
		await page.goto('/convites');

		await expect(page.getByText('Meus Convites')).toBeVisible();
		await expect(
			page.getByText('Convite recebido em 02/01/2026'),
		).toBeVisible();
	});
});
