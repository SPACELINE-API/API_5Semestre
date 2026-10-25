import { expect, test } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

test('exibe empresa vinculada, nome legado e ausência de empresa nos cards', async ({
	page,
}) => {
	await loginAs(page);
	await page.route('**/api/quotes?**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: [
					{
						id: 'quote-linked',
						company_id: 'company-1',
						company_name: 'Empresa atual',
						enterprise: 'Nome legado',
						status: 'pending',
						created_at: '2026-10-25T12:00:00Z',
						updated_at: '2026-10-25T12:00:00Z',
						items: [],
					},
					{
						id: 'quote-legacy',
						company_id: null,
						company_name: 'Empresa legada',
						enterprise: 'Empresa legada',
						status: 'pending',
						created_at: '2026-10-24T12:00:00Z',
						updated_at: '2026-10-24T12:00:00Z',
						items: [],
					},
					{
						id: 'quote-empty',
						company_id: null,
						company_name: null,
						enterprise: null,
						status: 'pending',
						created_at: '2026-10-23T12:00:00Z',
						updated_at: '2026-10-23T12:00:00Z',
						items: [],
					},
				],
				total: 3,
				page: 1,
				page_size: 10,
				total_pages: 1,
			}),
		}),
	);

	await page.goto('/orcamento');

	await expect(page.getByText('Empresa atual', { exact: true })).toBeVisible();
	await expect(page.getByText('Empresa legada', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Empresa não vinculada', { exact: true }),
	).toBeVisible();
});
