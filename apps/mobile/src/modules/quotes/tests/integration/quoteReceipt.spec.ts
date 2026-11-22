import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const quoteId = 'a1b2c3d4-quote-receipt';
const pdfUrl = 'https://files.example/receipts/comprovante.pdf';

const baseQuote = {
	id: quoteId,
	request_id: null,
	company_id: 'company-1',
	contact_id: null,
	status: 'approved',
	approved_at: '2026-10-25T12:05:00Z',
	approved_by_email: 'admin@spaceline.com.br',
	reproved_at: null,
	reproved_by_email: null,
	reproval_reason: null,
	service_order_id: null,
	total_value: 170,
	customer_name: 'Cliente de teste',
	enterprise: 'Empresa de teste',
	email: 'cliente@teste.com',
	original_language: 'pt-BR',
	translation_language: 'en-US',
	customer_need: 'Tradução juramentada',
	created_at: '2026-10-25T12:00:00Z',
	updated_at: '2026-10-25T12:05:00Z',
	items: [
		{
			id: 'quote-item-1',
			quote_id: quoteId,
			source_language: 'pt-BR',
			target_language: 'en-US',
			document_type: 'Contrato social',
			file_url: 'https://files.example/contrato.pdf',
			estimated_value: 120,
			created_at: '2026-10-25T12:00:00Z',
			updated_at: '2026-10-25T12:00:00Z',
		},
	],
};

const receipt = {
	quote_id: quoteId,
	company_id: 'company-1',
	status: 'available',
	pdf_url: pdfUrl,
	generated_at: '2026-10-25T12:06:00Z',
	sent_at: null,
	error_message: null,
};

function json(route: Route, body: unknown, status = 200) {
	return route.fulfill({
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	});
}

async function mockQuote(
	page: Page,
	{
		quote = baseQuote,
		receiptResponse,
	}: {
		quote?: typeof baseQuote;
		receiptResponse?: { status: number; body: unknown };
	} = {},
) {
	await loginAs(page);
	await page.route(/\/api\/quotes\?/, (route) =>
		json(route, {
			items: [quote],
			total: 1,
			page: 1,
			page_size: 10,
			total_pages: 1,
		}),
	);
	await page.route(/\/api\/quotes\/additional-services/, (route) =>
		json(route, [
			{
				id: 'service-1',
				quote_id: quoteId,
				description: 'Apostilamento',
				price: 50,
				created_at: '2026-10-25T12:00:00Z',
				updated_at: '2026-10-25T12:00:00Z',
			},
		]),
	);
	await page.route(/\/api\/support\/languages/, (route) =>
		json(route, [
			{ id: 'pt-BR', name: 'Português' },
			{ id: 'en-US', name: 'Inglês' },
		]),
	);
	await page.route(/\/api\/quotes\/[^/]+\/receipt$/, (route) =>
		receiptResponse
			? json(route, receiptResponse.body, receiptResponse.status)
			: json(route, receipt),
	);
	await page.route(/\/api\/quotes\/[^/]+\/receipt\/download$/, (route) =>
		json(route, { download_url: pdfUrl }),
	);
	await page.route(pdfUrl, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/pdf',
			body: '%PDF-1.4\n%%EOF',
		}),
	);

	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).click();
}

test('exibe o comprovante disponível e abre o PDF em nova aba', async ({
	page,
	context,
}) => {
	await mockQuote(page);

	await expect(page.getByText('Comprovante comercial')).toBeVisible();
	await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
	await expect(page.getByText(/Gerado em 25\/10\/2026/).first()).toBeVisible();

	await page
		.getByRole('button', { name: /Ver comprovante do orçamento/ })
		.click();

	const modal = page.getByRole('dialog').getByText('Orçamento #A1B2C3D4');
	await expect(modal).toBeVisible();
	await expect(page.getByText('Contrato social').last()).toBeVisible();
	await expect(page.getByText('Português').last()).toBeVisible();
	await expect(page.getByText('Inglês').last()).toBeVisible();
	await expect(page.getByText('Apostilamento').last()).toBeVisible();
	await expect(page.getByText('Valor total')).toBeVisible();
	await expect(page.getByText(/R\$\s170,00/).last()).toBeVisible();

	const popupPromise = context.waitForEvent('page');
	const pdfRequest = page.waitForRequest(pdfUrl);
	await page.getByRole('link', { name: /Abrir PDF do comprovante/ }).click();
	await popupPromise;
	await pdfRequest;

	await expect(page).toHaveURL(/\/orcamento/);
	await expect(modal).toBeVisible();
});

test('informa quando o comprovante ainda não está disponível', async ({
	page,
}) => {
	await mockQuote(page, {
		receiptResponse: { status: 404, body: { detail: 'Não encontrado' } },
	});

	await expect(
		page.getByText(
			'O comprovante comercial ainda não está disponível para este orçamento.',
		),
	).toBeVisible();
	await expect(
		page.getByRole('button', { name: /Ver comprovante do orçamento/ }),
	).toHaveCount(0);
});

test('informa quando o comprovante possui erro de geração', async ({
	page,
}) => {
	await mockQuote(page, {
		receiptResponse: {
			status: 200,
			body: {
				...receipt,
				status: 'error',
				pdf_url: null,
				error_message: 'Falha',
			},
		},
	});

	await expect(page.getByText('Erro', { exact: true })).toBeVisible();
	await expect(
		page.getByText(/Houve um erro na geração do comprovante/),
	).toBeVisible();
});

test('informa falha na consulta do comprovante', async ({ page }) => {
	await mockQuote(page, {
		receiptResponse: { status: 500, body: { detail: 'Erro interno' } },
	});

	await expect(
		page.getByText(
			'Não foi possível consultar o comprovante comercial. Tente novamente.',
		),
	).toBeVisible();
	await expect(page.getByText('Tentar novamente')).toBeVisible();
});

test('não exibe o comprovante para orçamento não aprovado', async ({
	page,
}) => {
	await mockQuote(page, {
		quote: {
			...baseQuote,
			status: 'pending',
			approved_at: null as unknown as string,
			approved_by_email: null as unknown as string,
		},
	});

	await expect(
		page.getByText('Aprovar orçamento', { exact: true }),
	).toBeVisible();
	await expect(page.getByText('Comprovante comercial')).toHaveCount(0);
});
