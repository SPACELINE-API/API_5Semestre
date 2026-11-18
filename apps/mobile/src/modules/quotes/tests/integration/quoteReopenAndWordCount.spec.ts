import { expect, test, type Page } from '@playwright/test';
import { loginAs } from '../../../clients/tests/integration/authHelper';

const quoteId = 'quote-reopen-words';

function makeItem(overrides: Record<string, unknown> = {}) {
	return {
		id: 'quote-item-1',
		quote_id: quoteId,
		source_language: 'pt-BR',
		target_language: 'en-US',
		document_type: 'Contrato',
		file_url: 'https://files.example/contrato.pdf',
		word_count: 1200,
		estimated_value: 120,
		created_at: '2026-11-10T12:00:00Z',
		updated_at: '2026-11-10T12:00:00Z',
		...overrides,
	};
}

function makeQuote(overrides: Record<string, unknown> = {}) {
	return {
		id: quoteId,
		request_id: null,
		company_id: 'company-1',
		contact_id: null,
		status: 'draft',
		approved_at: null,
		approved_by_email: null,
		reproved_at: null,
		reproved_by_email: null,
		reproval_reason: null,
		service_order_id: null,
		reopened_at: null,
		reopen_reason: null,
		reopened_by_email: null,
		reopen_count: 0,
		total_value: 120,
		customer_name: 'Cliente de teste',
		enterprise: 'Empresa de teste',
		email: 'cliente@teste.com',
		original_language: 'pt-BR',
		translation_language: 'en-US',
		customer_need: 'Contrato',
		created_at: '2026-11-10T12:00:00Z',
		updated_at: '2026-11-10T12:00:00Z',
		items: [makeItem()],
		...overrides,
	};
}

const reopenedQuote = makeQuote({
	reopened_at: '2026-11-15T14:30:00Z',
	reopen_reason: 'Cliente enviou nova versão do contrato',
	reopened_by_email: 'admin@spaceline.com.br',
	reopen_count: 1,
});

async function mockQuotes(page: Page, quote: ReturnType<typeof makeQuote>) {
	await page.route('**/api/quotes?**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: [quote],
				total: 1,
				page: 1,
				page_size: 10,
				total_pages: 1,
			}),
		}),
	);
	await page.route('**/api/quotes/additional-services?**', (route) =>
		route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
	);
}

async function openQuote(page: Page) {
	await page.goto('/orcamento');
	await page.getByRole('button', { name: /Expandir orçamento/ }).click();
}

test.describe('indicação de orçamento reaberto', () => {
	test('não aparece em orçamento que nunca foi reaberto', async ({ page }) => {
		await loginAs(page);
		await mockQuotes(page, makeQuote());

		await page.goto('/orcamento');

		await expect(
			page.getByRole('button', { name: /Expandir orçamento/ }),
		).toBeVisible();
		await expect(page.getByTestId('reopened-quote-indicator')).toHaveCount(0);
	});

	test('mostra o aviso ao passar o mouse e esconde ao sair', async ({
		page,
	}) => {
		await loginAs(page);
		await mockQuotes(page, reopenedQuote);
		await page.goto('/orcamento');

		const indicator = page.getByTestId('reopened-quote-indicator');
		await expect(indicator).toBeVisible();
		await expect(page.getByTestId('reopened-quote-tooltip')).toHaveCount(0);

		await indicator.hover();

		const tooltip = page.getByTestId('reopened-quote-tooltip');
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText('Orçamento reaberto');
		await expect(tooltip).toContainText(/reaberto em 15\/11\/2026/);
		await expect(tooltip).toContainText('por admin@spaceline.com.br');
		await expect(tooltip).toContainText(
			'Motivo: Cliente enviou nova versão do contrato',
		);

		await page.mouse.move(0, 0);
		await expect(tooltip).toHaveCount(0);
	});

	test('clicar no aviso não expande o orçamento', async ({ page }) => {
		await loginAs(page);
		await mockQuotes(page, reopenedQuote);
		await page.goto('/orcamento');

		await page.getByTestId('reopened-quote-indicator').click();

		await expect(page.getByTestId('reopened-quote-tooltip')).toBeVisible();
		await expect(
			page.getByRole('button', { name: /Expandir orçamento/ }),
		).toBeVisible();
		await expect(page.getByText(/^Documentos \(/)).toHaveCount(0);
	});

	test('informa quantas vezes o orçamento foi reaberto', async ({ page }) => {
		await loginAs(page);
		await mockQuotes(page, { ...reopenedQuote, reopen_count: 3 });
		await page.goto('/orcamento');

		await page.getByTestId('reopened-quote-indicator').hover();

		await expect(page.getByTestId('reopened-quote-tooltip')).toContainText(
			/reaberto 3 vezes\. A última reabertura foi em 15\/11\/2026/,
		);
	});
});

test.describe('indicação de orçamento reaberto no celular', () => {
	test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

	test('mostra o aviso ao tocar e esconde ao tocar de novo', async ({
		page,
	}) => {
		await loginAs(page);
		await mockQuotes(page, reopenedQuote);
		await page.goto('/orcamento');

		const indicator = page.getByTestId('reopened-quote-indicator');
		await indicator.tap();

		const tooltip = page.getByTestId('reopened-quote-tooltip');
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toContainText(
			'Motivo: Cliente enviou nova versão do contrato',
		);

		await indicator.tap();
		await expect(tooltip).toHaveCount(0);
	});
});

test.describe('contagem de palavras dos documentos', () => {
	test('mostra as palavras de cada documento e o total', async ({ page }) => {
		await loginAs(page);
		await mockQuotes(
			page,
			makeQuote({
				status: 'approved',
				items: [
					makeItem(),
					makeItem({
						id: 'quote-item-2',
						document_type: 'Procuração',
						file_url: 'https://files.example/procuracao.pdf',
						word_count: 300,
					}),
				],
			}),
		);

		await openQuote(page);

		await expect(page.getByTestId('quote-word-count-total')).toContainText(
			'Total de palavras: 1.500',
		);
		await expect(page.getByText('1.200 palavras')).toBeVisible();
		await expect(page.getByText('300 palavras')).toBeVisible();
		await expect(page.getByText(/documentos? sem contagem/)).toHaveCount(0);
	});

	test('avisa quando não foi possível contar as palavras de um arquivo', async ({
		page,
	}) => {
		await loginAs(page);
		await mockQuotes(
			page,
			makeQuote({
				status: 'approved',
				items: [
					makeItem(),
					makeItem({
						id: 'quote-item-2',
						document_type: 'Certidão digitalizada',
						file_url: 'https://files.example/certidao.pdf',
						word_count: null,
					}),
				],
			}),
		);

		await openQuote(page);

		await expect(page.getByTestId('quote-word-count-total')).toContainText(
			'Total de palavras: 1.200',
		);
		await expect(page.getByText('1 documento sem contagem')).toBeVisible();
		await expect(
			page.getByText('Não foi possível contar as palavras deste arquivo'),
		).toBeVisible();
	});

	test('não mostra o total quando nenhum documento tem arquivo', async ({
		page,
	}) => {
		await loginAs(page);
		await mockQuotes(
			page,
			makeQuote({ items: [makeItem({ file_url: null, word_count: null })] }),
		);

		await openQuote(page);

		await expect(page.getByText('Arquivo ainda não anexado')).toBeVisible();
		await expect(page.getByTestId('quote-word-count-total')).toHaveCount(0);
	});

	test('anexar um arquivo na edição salva a contagem de palavras', async ({
		page,
	}) => {
		await loginAs(page, { extraPermissions: ['documents.write'] });
		await mockQuotes(
			page,
			makeQuote({ items: [makeItem({ file_url: null, word_count: null })] }),
		);
		await page.route('**/api/quotes/upload-document', (route) =>
			route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					file_url: 'https://files.example/novo-contrato.pdf',
					word_count: 845,
				}),
			}),
		);
		await page.route(`**/api/quotes/${quoteId}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(makeQuote({ items: [] })),
			}),
		);
		let savedItem: Record<string, unknown> | null = null;
		await page.route(
			`**/api/quotes/${quoteId}/translation-items/quote-item-1`,
			(route) => {
				savedItem = route.request().postDataJSON();
				return route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(
						makeItem({
							file_url: 'https://files.example/novo-contrato.pdf',
							word_count: 845,
						}),
					),
				});
			},
		);

		await openQuote(page);
		await page.getByLabel('Editar orçamento').click();
		const fileChooser = page.waitForEvent('filechooser');
		await page.getByLabel('Anexar arquivo').click();
		await (
			await fileChooser
		).setFiles({
			name: 'novo-contrato.pdf',
			mimeType: 'application/pdf',
			buffer: Buffer.from('%PDF-1.4'),
		});

		await expect(page.getByLabel('Quantidade de palavras')).toHaveValue('845');
		await expect(page.getByTestId('quote-word-count-total')).toContainText(
			'Total de palavras: 845',
		);

		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect.poll(() => savedItem?.word_count).toBe(845);
		await expect(page.getByText('845 palavras')).toBeVisible();
	});

	async function editWordCount(
		page: Page,
		item: ReturnType<typeof makeItem>,
	): Promise<() => Record<string, unknown> | null> {
		await loginAs(page);
		await mockQuotes(page, makeQuote({ items: [item] }));
		await page.route(`**/api/quotes/${quoteId}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(makeQuote({ items: [] })),
			}),
		);
		let savedItem: Record<string, unknown> | null = null;
		await page.route(
			`**/api/quotes/${quoteId}/translation-items/quote-item-1`,
			(route) => {
				savedItem = route.request().postDataJSON();
				return route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(makeItem({ word_count: savedItem?.word_count })),
				});
			},
		);
		await openQuote(page);
		await page.getByLabel('Editar orçamento').click();
		return () => savedItem;
	}

	test('permite informar a contagem quando o arquivo não pôde ser lido', async ({
		page,
	}) => {
		const savedItem = await editWordCount(page, makeItem({ word_count: null }));
		const field = page.getByLabel('Quantidade de palavras');

		await expect(field).toHaveValue('');
		await expect(
			page.getByText(/Informe a quantidade manualmente/),
		).toBeVisible();

		await field.fill('1.250 palavras');

		await expect(field).toHaveValue('1250');
		await expect(
			page.getByText(/Informe a quantidade manualmente/),
		).toHaveCount(0);
		await expect(page.getByTestId('quote-word-count-total')).toContainText(
			'Total de palavras: 1.250',
		);
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect.poll(() => savedItem()?.word_count).toBe(1250);
		await expect(page.getByText('1.250 palavras')).toBeVisible();
	});

	test('permite corrigir a contagem feita pelo sistema', async ({ page }) => {
		const savedItem = await editWordCount(page, makeItem({ word_count: 1200 }));
		const field = page.getByLabel('Quantidade de palavras');

		await expect(field).toHaveValue('1200');
		await field.fill('980');
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect.poll(() => savedItem()?.word_count).toBe(980);
	});

	test('apagar a contagem deixa o documento sem contagem', async ({ page }) => {
		const savedItem = await editWordCount(page, makeItem({ word_count: 1200 }));

		await page.getByLabel('Quantidade de palavras').fill('');
		await page.getByText('Salvar alterações', { exact: true }).click();

		await expect.poll(() => savedItem() !== null).toBe(true);
		expect(savedItem()?.word_count).toBeNull();
	});
});

test.describe('contagem de palavras no novo orçamento', () => {
	async function attachFile(page: Page, wordCount: number | null) {
		await loginAs(page, { extraPermissions: ['documents.write'] });
		await page.route('**/api/quotes/upload-document', (route) =>
			route.fulfill({
				status: 201,
				contentType: 'application/json',
				body: JSON.stringify({
					file_url: 'https://files.example/contrato.pdf',
					word_count: wordCount,
				}),
			}),
		);
		await page.goto('/orcamento/novo-orcamento');
		const fileChooser = page.waitForEvent('filechooser');
		await page.getByLabel('Anexar arquivo').click();
		await (
			await fileChooser
		).setFiles({
			name: 'contrato.pdf',
			mimeType: 'application/pdf',
			buffer: Buffer.from('%PDF-1.4'),
		});
	}

	test('preenche a contagem ao anexar e permite alterar', async ({ page }) => {
		await attachFile(page, 845);
		const field = page.getByLabel('Quantidade de palavras');

		await expect(field).toHaveValue('845');
		await field.fill('900');
		await expect(field).toHaveValue('900');
	});

	test('pede a contagem manual quando o arquivo não pôde ser lido', async ({
		page,
	}) => {
		await attachFile(page, null);
		const field = page.getByLabel('Quantidade de palavras');

		await expect(field).toHaveValue('');
		await expect(
			page.getByText(/Informe a quantidade manualmente/),
		).toBeVisible();
		await field.fill('abc300');
		await expect(field).toHaveValue('300');
	});
});
