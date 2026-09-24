import { test, expect } from '@playwright/test';
import { loginAs } from './authHelper';

const COMPANY_A = {
	id: '1',
	legal_name: 'Acme Tecnologia Ltda',
	trade_name: 'Acme Tech',
	cnpj: '11222333000181',
	industry: 'Tecnologia',
	phone: '11987654321',
	email: 'contato@acmetech.com',
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

test.describe('Export selected companies as JSON', () => {
	test('triggers a JSON file download with the selected companies', async ({
		page,
	}) => {
		await page.route('**/api/clients*', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					items: [COMPANY_A],
					total: 1,
					page: 1,
					page_size: 100,
				}),
			});
		});

		await loginAs(page);
		await page.goto('/clientes');
		await expect(page.getByText('Acme Tech')).toBeVisible();

		await page.getByLabel('Selecionar Acme Tech').click();

		const downloadPromise = page.waitForEvent('download');
		await page.getByText('Exportar JSON').click();
		const download = await downloadPromise;

		expect(download.suggestedFilename()).toMatch(
			/^empresas-\d{4}-\d{2}-\d{2}\.json$/,
		);

		const stream = await download.createReadStream();
		const chunks: Buffer[] = [];
		for await (const chunk of stream) {
			chunks.push(chunk as Buffer);
		}
		const content = JSON.parse(Buffer.concat(chunks).toString('utf-8'));

		expect(content).toHaveLength(1);
		expect(content[0]).toMatchObject({ trade_name: 'Acme Tech' });
	});
});
