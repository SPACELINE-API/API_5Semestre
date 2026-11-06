import { expect, test, type Page } from '@playwright/test';

const sessionCookie = encodeURIComponent(
	JSON.stringify({
		access_token: 'company-report-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'company-report-user', email: 'admin@example.com' },
	}),
);

const companies = [
	{ id: 'company-1', trade_name: 'Empresa Alfa' },
	{ id: 'company-2', trade_name: 'Empresa Beta' },
];

async function openReportModal(page: Page) {
	await page.getByRole('button', { name: 'Gerar relatório' }).click();
	await expect(
		page.getByRole('heading', { name: 'Gerar relatório' }),
	).toBeVisible();
}

async function chooseDate(page: Page, label: string) {
	await page.getByRole('button', { name: `Selecionar data: ${label}` }).click();
	await page.getByRole('button', { name: 'Hoje' }).click();
}

test.describe('modal de relatório de propostas', () => {
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
					user: { id: 'company-report-user', email: 'admin@example.com' },
					roles: [{ id: 'admin', name: 'Administrador' }],
					permissions: ['proposals.read'],
				}),
			}),
		);
		await page.route('**/api/quotes/proposals/companies', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
		await page.route('**/api/clients', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(companies),
			}),
		);
		await page.route('**/api/quotes/proposals?**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ items: [], total: 0, page: 1, page_size: 10 }),
			}),
		);
		await page.goto('/propostas');
	});

	test('seleciona uma empresa e valida o período obrigatório', async ({
		page,
	}) => {
		await openReportModal(page);
		await page.getByRole('textbox', { name: 'Buscar empresa' }).click();
		await page.getByText('Empresa Alfa', { exact: true }).click();
		await expect(page.getByText('Empresa Alfa', { exact: true })).toHaveCount(
			1,
		);

		await page.getByRole('button', { name: 'Gerar relatório' }).last().click();
		await expect(
			page
				.getByText('Informe o período inicial e final.', { exact: true })
				.last(),
		).toBeVisible();
	});

	test('seleciona todas as empresas e envia a seleção correta', async ({
		page,
	}) => {
		let requestBody: Record<string, unknown> | undefined;
		await page.route('**/api/quotes/proposals/reports', async (route) => {
			requestBody = route.request().postDataJSON() as Record<string, unknown>;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					url: 'http://127.0.0.1:5183/signed/relatorio-propostas.xlsx',
					filename: 'relatorio-propostas.xlsx',
					expires_in: 300,
				}),
			});
		});

		await openReportModal(page);
		await page
			.getByRole('checkbox', { name: 'Selecionar todas as empresas' })
			.click();
		await chooseDate(page, 'Data inicial');
		await chooseDate(page, 'Data final');
		await page.getByRole('button', { name: 'Gerar relatório' }).last().click();

		await expect
			.poll(() => requestBody)
			.toMatchObject({
				selection: 'all',
				start_date: expect.any(String),
				end_date: expect.any(String),
			});
		expect(requestBody).not.toHaveProperty('company_ids');
	});

	test('baixa CSV com as empresas e período selecionados', async ({ page }) => {
		await page.route('**/signed/relatorio-propostas.csv', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/csv; charset=utf-8',
				headers: {
					'Content-Disposition': 'attachment; filename=relatorio-propostas.csv',
				},
				body: 'Empresa;Total\nEmpresa Alfa;1',
			}),
		);
		await page.route('**/api/quotes/proposals/reports', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					url: 'http://127.0.0.1:5183/signed/relatorio-propostas.csv',
					filename: 'relatorio-propostas.csv',
					expires_in: 300,
				}),
			}),
		);

		await openReportModal(page);
		await page.getByRole('textbox', { name: 'Buscar empresa' }).click();
		await page.getByText('Empresa Alfa', { exact: true }).click();
		await chooseDate(page, 'Data inicial');
		await chooseDate(page, 'Data final');
		await page.getByRole('button', { name: 'Formato' }).click();
		await page.getByText('CSV', { exact: true }).click();

		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Gerar relatório' }).last().click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toBe('relatorio-propostas.csv');
	});
});
