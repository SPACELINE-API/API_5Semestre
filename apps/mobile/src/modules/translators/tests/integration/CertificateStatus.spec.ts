import { expect, test, type Page } from '@playwright/test';
import type { TranslatorCertificate } from '../../types/certificate';
import { loginAsTranslator } from './authHelper';

const PDF = Buffer.from(`%PDF-1.7\n${'0'.repeat(2048)}\n%%EOF\n`);
const SIGNED_URL =
	'http://localhost:8000/storage/v1/object/sign/translator-certificates/t1/cert.pdf?token=abc';

const PROFILE = {
	id: 'translator-1',
	name: 'Maria Tradutora',
	email: 'maria.tradutora@example.com',
	phone: '11988887777',
	is_active: true,
	photo_url: null,
	photo_filename: null,
	photo_size_bytes: null,
	qualifications: [],
	languages: [],
};

function certificate(
	overrides: Pick<
		TranslatorCertificate,
		| 'id'
		| 'language_id'
		| 'language_name'
		| 'proficiency_level'
		| 'filename'
		| 'status'
	> &
		Partial<TranslatorCertificate>,
): TranslatorCertificate {
	return {
		translator_id: 'translator-1',
		content_type: 'application/pdf',
		size_bytes: 1_048_576,
		review_note: null,
		reviewed_at: null,
		created_at: '2026-10-18T21:00:00Z',
		updated_at: '2026-10-18T21:00:00Z',
		...overrides,
	};
}

const APPROVED = certificate({
	id: 'certificate-approved',
	language_id: 'es-ES',
	language_name: 'Espanhol (Espanha)',
	proficiency_level: 'advanced',
	filename: 'certificado-dele.pdf',
	status: 'approved',
});
const PENDING = certificate({
	id: 'certificate-pending',
	language_id: 'de-DE',
	language_name: 'Alemão',
	proficiency_level: 'intermediate',
	filename: 'goethe-b1.pdf',
	status: 'pending',
});
const REJECTED = certificate({
	id: 'certificate-rejected',
	language_id: 'fr-FR',
	language_name: 'Francês (França)',
	proficiency_level: 'fluent',
	filename: 'delf-c1.pdf',
	status: 'rejected',
	review_note: 'Documento ilegível',
});

function json(body: unknown, status = 200) {
	return {
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	};
}

async function mockApi(
	page: Page,
	certificates: TranslatorCertificate[],
	{ fileStatus = 200 }: { fileStatus?: number } = {},
) {
	let current = [...certificates];
	await page.route('**/api/translators/me', (route) =>
		route.fulfill(json(PROFILE)),
	);
	await page.route('**/api/translators/me/certificates/languages', (route) =>
		route.fulfill(
			json([
				{ id: 'de-DE', name: 'Alemão' },
				{ id: 'fr-FR', name: 'Francês (França)' },
			]),
		),
	);
	await page.route('**/api/translators/me/certificates/*/file', (route) =>
		fileStatus === 200
			? route.fulfill(json({ url: SIGNED_URL, expires_in: 300 }))
			: route.fulfill(
					json(
						{ detail: 'Arquivo indisponível no armazenamento.' },
						fileStatus,
					),
				),
	);
	// O LINK ABRE EM OUTRA ABA: A SIMULACAO PRECISA VALER PARA TODO O CONTEXTO
	await page
		.context()
		.route(SIGNED_URL, (route) =>
			route.fulfill({ status: 200, contentType: 'application/pdf', body: PDF }),
		);
	await page.route('**/api/translators/me/certificates', (route) => {
		if (route.request().method() === 'GET') return route.fulfill(json(current));

		const replaced: TranslatorCertificate = {
			...REJECTED,
			filename: 'delf-c1-legivel.pdf',
			status: 'pending',
			review_note: null,
		};
		current = current.map((item) =>
			item.id === REJECTED.id ? replaced : item,
		);
		return route.fulfill(json(replaced, 201));
	});
}

async function openCertificatesTab(page: Page) {
	await loginAsTranslator(page);
	await page.goto('/meu-perfil');
	await page.getByText('Certificados', { exact: true }).click();
}

test('exibe o nome e o status de cada certificado', async ({ page }) => {
	await mockApi(page, [APPROVED, PENDING, REJECTED]);
	await openCertificatesTab(page);

	await expect(page.getByText(/certificado-dele\.pdf/)).toBeVisible();
	await expect(page.getByText(/goethe-b1\.pdf/)).toBeVisible();
	await expect(page.getByText(/delf-c1\.pdf/)).toBeVisible();
	await expect(page.getByText('Válido', { exact: true })).toBeVisible();
	await expect(page.getByText('Em análise', { exact: true })).toBeVisible();
	await expect(page.getByText('Recusado', { exact: true })).toBeVisible();
});

test('informa quando nenhum certificado foi anexado', async ({ page }) => {
	await mockApi(page, []);
	await openCertificatesTab(page);

	await expect(page.getByText('Nenhum certificado foi anexado.')).toBeVisible();
});

test('abre o modal ao selecionar e mostra o motivo da recusa', async ({
	page,
}) => {
	await mockApi(page, [REJECTED]);
	await openCertificatesTab(page);

	await page.getByLabel(/Certificado de Francês \(França\)/).click();

	await expect(page.getByText('Certificado recusado')).toBeVisible();
	await expect(page.getByText('Documento ilegível')).toBeVisible();
	await expect(page.getByText('Substituir', { exact: true })).toBeVisible();
});

test('certificado válido não oferece substituição', async ({ page }) => {
	await mockApi(page, [APPROVED]);
	await openCertificatesTab(page);

	await page.getByLabel(/Certificado de Espanhol/).click();

	await expect(page.getByText('Certificado válido')).toBeVisible();
	await expect(page.getByText('Substituir', { exact: true })).toHaveCount(0);
});

test('certificado pendente exibe mensagem de análise', async ({ page }) => {
	await mockApi(page, [PENDING]);
	await openCertificatesTab(page);

	await page.getByLabel(/Certificado de Alemão/).click();

	await expect(page.getByText('Certificado pendente')).toBeVisible();
	await expect(
		page.getByText('aguarda a avaliação do administrador'),
	).toBeVisible();
});

test('abre o arquivo por link temporário', async ({ page }) => {
	await mockApi(page, [PENDING]);
	await openCertificatesTab(page);
	await page.getByLabel(/Certificado de Alemão/).click();

	// O NAVEGADOR PODE BAIXAR O PDF EM VEZ DE EXIBI-LO (EX.: CHROMIUM DA CI),
	// ENTAO O TESTE CONFIRMA QUE A NOVA ABA REQUISITOU O LINK TEMPORARIO
	const popupPromise = page.waitForEvent('popup');
	const signedRequest = page
		.context()
		.waitForEvent('request', (request) => request.url() === SIGNED_URL);
	await page.getByText('Visualizar arquivo').click();

	await popupPromise;
	expect((await signedRequest).url()).toBe(SIGNED_URL);
});

test('exibe mensagem quando o arquivo está indisponível', async ({ page }) => {
	await mockApi(page, [PENDING], { fileStatus: 404 });
	await openCertificatesTab(page);
	await page.getByLabel(/Certificado de Alemão/).click();

	await page.getByText('Visualizar arquivo').click();

	await expect(page.getByText('Certificado indisponível')).toBeVisible();
	await expect(
		page.getByText('não foi encontrado no armazenamento'),
	).toBeVisible();
	await page.getByText('Fechar', { exact: true }).click();
	await expect(page.getByText('Indisponível', { exact: true })).toBeVisible();
});

test('substitui o certificado e exibe o novo arquivo após o envio', async ({
	page,
}) => {
	await mockApi(page, [REJECTED]);
	await openCertificatesTab(page);
	await page.getByLabel(/Certificado de Francês \(França\)/).click();
	await page.getByText('Substituir', { exact: true }).click();

	await expect(page.getByText('Substituir certificado')).toBeVisible();
	await expect(page.getByLabel('Selecionar idioma')).toContainText(
		'Francês (França)',
	);

	const dataTransfer = await page.evaluateHandle(
		(bytes) => {
			const transfer = new DataTransfer();
			transfer.items.add(
				new File([new Uint8Array(bytes)], 'delf-c1-legivel.pdf', {
					type: 'application/pdf',
				}),
			);
			return transfer;
		},
		[...PDF],
	);
	await page
		.getByText('Arraste o arquivo para cá')
		.dispatchEvent('drop', { dataTransfer });

	// NA SUBSTITUICAO DE UM CERTIFICADO JA ENVIADO, A TROCA PRECISA SER CONFIRMADA
	await expect(page.getByText('Substituir certificado?')).toBeVisible();
	await expect(
		page.getByText(
			'O certificado atual "delf-c1.pdf" será substituído por "delf-c1-legivel.pdf".',
		),
	).toBeVisible();
	await page.getByText('Substituir', { exact: true }).click();
	await page.getByText('Enviar', { exact: true }).click();

	await expect(page.getByText('Certificado enviado')).toBeVisible();
	await page.getByText('OK', { exact: true }).click();
	await expect(page.getByText(/delf-c1-legivel\.pdf/)).toBeVisible();
	await expect(page.getByText('Em análise', { exact: true })).toBeVisible();
});

test('cancelar a confirmação mantém o certificado atual sem arquivo novo', async ({
	page,
}) => {
	await mockApi(page, [REJECTED]);
	await openCertificatesTab(page);
	await page.getByLabel(/Certificado de Francês \(França\)/).click();
	await page.getByText('Substituir', { exact: true }).click();

	const dataTransfer = await page.evaluateHandle(
		(bytes) => {
			const transfer = new DataTransfer();
			transfer.items.add(
				new File([new Uint8Array(bytes)], 'outro-arquivo.pdf', {
					type: 'application/pdf',
				}),
			);
			return transfer;
		},
		[...PDF],
	);
	await page
		.getByText('Arraste o arquivo para cá')
		.dispatchEvent('drop', { dataTransfer });
	await page.getByText('Cancelar', { exact: true }).click();

	await expect(page.getByText('Substituir certificado?')).toHaveCount(0);
	await expect(page.getByText('outro-arquivo.pdf')).toHaveCount(0);
	await expect(page.getByText('Arraste o arquivo para cá')).toBeVisible();
});
