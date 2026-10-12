import { expect, test } from '@playwright/test';
import { loginAs } from './authHelper';

const SERVICE_ORDER = {
	id: 'order-1',
	quote_id: 'quote-1',
	company_id: 'company-1',
	project_name: 'Tradução de contrato comercial',
	deadline: '2026-12-01T00:00:00Z',
	domain_area: null,
	price_category: null,
	internal_notes: null,
	external_notes: null,
	status: 'em_andamento',
	items: [],
	files: [
		{
			id: 'input-file-1',
			service_order_id: 'order-1',
			filename: 'contrato-original.pdf',
			file_url: 'https://storage.example/contrato-original.pdf',
			direction: 'entrada',
			uploaded_at: '2026-01-01T00:00:00Z',
		},
		{
			id: 'output-file-1',
			service_order_id: 'order-1',
			filename: 'contrato-traduzido.pdf',
			file_url: 'https://storage.example/contrato-traduzido.pdf',
			direction: 'saida',
			uploaded_at: '2026-01-02T00:00:00Z',
		},
	],
	created_at: '2026-01-01T00:00:00Z',
	updated_at: '2026-01-01T00:00:00Z',
};

const EMAIL_TEMPLATE = {
	key: 'translated_document_delivery',
	subject: 'Tradução concluída',
	body_html:
		'<p>Olá, {{nome_cliente}}!</p><p>A tradução solicitada foi concluída.</p>',
	updated_at: '2026-01-01T00:00:00Z',
	available_placeholders: ['{{nome_cliente}}'],
};

test('abre a conclusão e exibe template, documentos traduzidos e observação', async ({
	page,
}) => {
	await page.route('**/api/clients', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/contacts', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/translators', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
	await page.route('**/api/service-orders/order-1', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(SERVICE_ORDER),
		}),
	);
	await page.route('**/api/service-orders/email-template', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(EMAIL_TEMPLATE),
		}),
	);

	await loginAs(page);
	await page.goto('/ordens-de-servico/order-1', {
		waitUntil: 'domcontentloaded',
	});

	await page.getByRole('button', { name: 'Concluir Ordem de Serviço' }).click();
	await expect(
		page.getByText('Concluir ordem de serviço', { exact: true }),
	).toBeVisible();
	await expect(page.getByLabel('Assunto do e-mail')).toHaveValue(
		EMAIL_TEMPLATE.subject,
	);
	await expect(page.getByLabel('Mensagem do e-mail')).toHaveValue(
		'Olá, {{nome_cliente}}!\n\nA tradução solicitada foi concluída.',
	);
	await expect(page.getByText('contrato-traduzido.pdf')).toBeVisible();
	await expect(page.getByText('contrato-original.pdf')).not.toBeVisible();

	await page
		.getByLabel('Observação opcional para o e-mail')
		.fill('A observação será incluída nesta mensagem.');
	await expect(
		page.getByLabel('Observação opcional para o e-mail'),
	).toHaveValue('A observação será incluída nesta mensagem.');
	await expect(page.getByRole('button', { name: 'Enviar' })).toBeEnabled();

	let sentPayload: Record<string, string> | undefined;
	await page.route(
		'**/api/service-orders/order-1/deliveries',
		async (route) => {
			sentPayload = route.request().postDataJSON() as Record<string, string>;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{
						id: 'delivery-1',
						service_order_id: 'order-1',
						document_file_id: 'output-file-1',
						recipient_email: 'cliente@example.com',
						template_key: EMAIL_TEMPLATE.key,
						status: 'sent',
						error_message: null,
						attempted_at: '2026-01-03T00:00:00Z',
						sent_at: '2026-01-03T00:00:00Z',
					},
				]),
			});
		},
	);

	await page.getByRole('button', { name: 'Enviar' }).click();
	await expect.poll(() => sentPayload).toBeDefined();
	expect(sentPayload?.subject_override).toBe(EMAIL_TEMPLATE.subject);
	expect(sentPayload?.body_html_override).toContain(
		'A observação será incluída nesta mensagem.',
	);
	expect(sentPayload?.body_html_override).toContain(
		'<strong>Observação:</strong>',
	);
	await expect(
		page.getByText('Concluir ordem de serviço', { exact: true }),
	).not.toBeVisible();
});
