import { expect, test } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const quoteId = 'quote-created-in-app';
const serviceOrderId = 'service-order-created-on-approval';

const pendingQuote = {
	id: quoteId,
	request_id: null,
	company_id: 'company-1',
	contact_id: null,
	status: 'pending',
	approved_at: null,
	approved_by_email: null,
	reproved_at: null,
	reproved_by_email: null,
	reproval_reason: null,
	service_order_id: null,
	total_value: 120,
	customer_name: 'Cliente de teste',
	enterprise: 'Empresa de teste',
	email: 'cliente@teste.com',
	original_language: 'pt-BR',
	translation_language: 'en-US',
	customer_need: 'Contrato',
	created_at: '2026-10-25T12:00:00Z',
	updated_at: '2026-10-25T12:00:00Z',
	items: [
		{
			id: 'quote-item-created-in-app',
			quote_id: quoteId,
			source_language: 'pt-BR',
			target_language: 'en-US',
			document_type: 'Contrato',
			file_url: 'https://files.example/contrato.pdf',
			estimated_value: 120,
			created_at: '2026-10-25T12:00:00Z',
			updated_at: '2026-10-25T12:00:00Z',
		},
	],
};

test('abre a ordem de serviço criada ao aprovar orçamento manual', async ({
	page,
}) => {
	await loginAs(page);
	await page.route('**/api/quotes?**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: [pendingQuote],
				total: 1,
				page: 1,
				page_size: 10,
				total_pages: 1,
			}),
		}),
	);
	await page.route(`**/api/quotes/${quoteId}/status`, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				id: quoteId,
				company_id: pendingQuote.company_id,
				contact_id: null,
				status: 'approved',
				service_order_id: serviceOrderId,
				approved_at: '2026-10-25T12:05:00Z',
				approved_by_email: 'admin@spaceline.com.br',
				created_at: pendingQuote.created_at,
				updated_at: '2026-10-25T12:05:00Z',
			}),
		}),
	);

	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).click();
	await page.getByText('Aprovar orçamento', { exact: true }).click();

	const openServiceOrder = page.getByRole('button', {
		name: /Abrir ordem de serviço do orçamento/,
	});
	await expect(openServiceOrder).toBeVisible();
	await openServiceOrder.click();
	await expect(page).toHaveURL(
		new RegExp(`/ordens-de-servico/${serviceOrderId}`),
	);
});
