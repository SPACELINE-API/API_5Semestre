import { expect, test } from '@playwright/test';
import { loginAs } from './authHelper';

const SERVICE_ORDER = {
	id: 'order-review',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Contrato para revisão',
	deadline: '2026-12-01T00:00:00Z',
	status: 'em_andamento',
	items: [],
	files: [
		{
			id: 'delivery-review',
			service_order_id: 'order-review',
			filename: 'contrato-traduzido.pdf',
			file_url: 'https://storage.example/contrato-traduzido.pdf',
			direction: 'saida',
			review_status: 'pending',
			uploaded_at: '2026-01-02T00:00:00Z',
		},
	],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

async function prepareReviewPage(
	page: Parameters<typeof loginAs>[0],
	permissions: string[],
) {
	for (const path of ['clients', 'contacts', 'translators']) {
		await page.route(`**/api/${path}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
	}
	await page.route(/\/api\/quotes\/additional-services/, (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/service-orders/order-review', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(SERVICE_ORDER),
		}),
	);
	await loginAs(page, permissions);
	await page.goto('/ordens-de-servico/order-review?tab=revisao', {
		waitUntil: 'domcontentloaded',
	});
	await page.getByRole('tab', { name: 'Ver aba Revisão' }).click();
	await expect(page.getByText('contrato-traduzido.pdf')).toBeVisible();
}

test('mantém os dados visíveis e bloqueia ações de revisão sem documents.write', async ({
	page,
}) => {
	let reviewRequests = 0;
	await page.route(
		'**/api/service-orders/order-review/files/delivery-review/**',
		async (route) => {
			reviewRequests += 1;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '{}',
			});
		},
	);

	await prepareReviewPage(page, ['service_orders.read', 'documents.read']);

	const approveButton = page.getByRole('button', { name: 'Aprovar entrega' });
	const changesButton = page.getByRole('button', { name: 'Pedir ajustes' });
	await expect(approveButton).toBeDisabled();
	await expect(changesButton).toBeDisabled();
	await approveButton.click({ force: true });
	await changesButton.click({ force: true });
	await expect.poll(() => reviewRequests).toBe(0);
	await expect(page.getByText('contrato-traduzido.pdf')).toBeVisible();
});

test('permite aprovar e solicitar ajustes com documents.write', async ({
	page,
}) => {
	const reviewRequests: string[] = [];
	await page.route(
		'**/api/service-orders/order-review/files/delivery-review/**',
		async (route) => {
			reviewRequests.push(route.request().method());
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '{}',
			});
		},
	);

	await prepareReviewPage(page, [
		'service_orders.read',
		'documents.read',
		'documents.write',
	]);

	const approveButton = page.getByRole('button', { name: 'Aprovar entrega' });
	const changesButton = page.getByRole('button', { name: 'Pedir ajustes' });
	await expect(approveButton).toBeEnabled();
	await expect(changesButton).toBeEnabled();
	await changesButton.click();
	await page.getByRole('textbox').fill('Corrigir a página 2.');
	await page.getByRole('button', { name: 'Enviar pedido' }).click();
	await expect.poll(() => reviewRequests.length).toBe(1);
	await approveButton.click();
	await expect.poll(() => reviewRequests.length).toBe(2);
	expect(reviewRequests).toEqual(['POST', 'POST']);
});
