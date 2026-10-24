import { expect, test } from '@playwright/test';

const sessionCookie = encodeURIComponent(
	JSON.stringify({
		access_token: 'proposal-filter-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'proposal-filter-test-user', email: 'admin@example.com' },
	}),
);

const proposalPage = JSON.stringify({
	items: [],
	total: 0,
	page: 1,
	page_size: 10,
});

test.describe('filtros de propostas', () => {
	test.beforeEach(async ({ page }) => {
		await page.context().addCookies([
			{
				name: 'spaceline_session',
				value: sessionCookie,
				url: 'http://127.0.0.1:5183',
			},
		]);
		await page.route('**/api/auth/me', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					user: { id: 'proposal-filter-test-user', email: 'admin@example.com' },
					roles: [{ id: 'test-admin', name: 'Administrador' }],
					permissions: ['proposals.read'],
				}),
			}),
		);
		await page.route('**/api/quotes/proposals/companies', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(['Empresa Alfa']),
			}),
		);
		await page.route('**/api/quotes/proposals?**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: proposalPage,
			}),
		);
		await page.goto('/propostas');
	});

	test('mantém aberto apenas o calendário de data selecionado', async ({
		page,
	}) => {
		const renderWarnings: string[] = [];
		page.on('console', (message) => {
			if (
				message.type() === 'error' &&
				message.text().includes('Cannot update a component')
			) {
				renderWarnings.push(message.text());
			}
		});
		const startDate = page.getByRole('button', {
			name: 'Selecionar data: De',
		});
		const endDate = page.getByRole('button', {
			name: 'Selecionar data: Até',
		});

		await startDate.click();
		await expect(page.getByRole('dialog')).toHaveCount(1);
		await expect(startDate).toHaveAttribute('aria-expanded', 'true');

		await endDate.click();
		await expect(page.getByRole('dialog')).toHaveCount(1);
		await expect(startDate).toHaveAttribute('aria-expanded', 'false');
		await expect(endDate).toHaveAttribute('aria-expanded', 'true');

		await startDate.click();
		await expect(page.getByRole('dialog')).toHaveCount(1);
		await expect(startDate).toHaveAttribute('aria-expanded', 'true');
		await expect(endDate).toHaveAttribute('aria-expanded', 'false');
		expect(renderWarnings).toEqual([]);
	});

	test('limpa os filtros depois de fechar o calendário', async ({ page }) => {
		const startDate = page.getByRole('button', {
			name: 'Selecionar data: De',
		});

		await startDate.click();
		await page.getByRole('button', { name: 'Hoje' }).click();
		await expect(startDate).toContainText(/\d{2}\/\d{2}\/\d{4}/);

		await startDate.click();
		await expect(page.getByRole('dialog')).toHaveCount(1);
		await page.getByText('Propostas comerciais', { exact: true }).click();
		await expect(page.getByRole('dialog')).toHaveCount(0);
		await page.getByRole('button', { name: 'Limpar filtros' }).click();

		await expect(page.getByRole('dialog')).toHaveCount(0);
		await expect(startDate).toContainText('Início');
		await expect(
			page.getByRole('button', { name: 'Limpar filtros' }),
		).toHaveCount(0);
	});

	test('mantém o popover acima do botão de limpar filtros', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		const startDate = page.getByRole('button', {
			name: 'Selecionar data: De',
		});

		await startDate.click();
		await page.getByRole('button', { name: 'Hoje' }).click();
		await startDate.click();

		const clearFilters = page.getByRole('button', { name: 'Limpar filtros' });
		const bounds = await clearFilters.boundingBox();
		expect(bounds).not.toBeNull();
		const popoverOverlapsButton = await page.evaluate(
			({ x, y }) =>
				Boolean(document.elementFromPoint(x, y)?.closest('[role="dialog"]')),
			{
				x: Math.floor(bounds!.x + bounds!.width / 2),
				y: Math.floor(bounds!.y + bounds!.height / 2),
			},
		);

		expect(popoverOverlapsButton).toBe(true);
	});
});
