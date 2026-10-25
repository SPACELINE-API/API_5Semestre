import { expect, test, type Page } from '@playwright/test';
import type { TranslatorCertificate } from '../../types/certificate';
import { loginAsAdmin } from './authHelper';

const TRANSLATOR_ID = 'a1a2a3a4-0000-4000-8000-000000000001';
const SIGNED_URL =
	'http://localhost:8000/storage/v1/object/sign/translator-certificates/t1/arabe.pdf?token=abc';

function certificate(
	overrides: Pick<
		TranslatorCertificate,
		'id' | 'language_id' | 'language_name' | 'status'
	> &
		Partial<TranslatorCertificate>,
): TranslatorCertificate {
	return {
		translator_id: TRANSLATOR_ID,
		proficiency_level: 'intermediate',
		filename: 'certificado.pdf',
		content_type: 'application/pdf',
		size_bytes: 1_048_576,
		review_note: null,
		reviewed_at: null,
		created_at: '2026-10-22T10:00:00Z',
		updated_at: '2026-10-22T10:00:00Z',
		...overrides,
	};
}

const PENDING = certificate({
	id: 'cert-pending',
	language_id: 'ar-EG',
	language_name: 'Árabe (Egito)',
	filename: 'arabe.pdf',
	status: 'pending',
});
const SECOND_PENDING = certificate({
	id: 'cert-pending-2',
	language_id: 'de-DE',
	language_name: 'Alemão',
	status: 'pending',
});
const APPROVED = certificate({
	id: 'cert-approved',
	language_id: 'es-ES',
	language_name: 'Espanhol (Espanha)',
	status: 'approved',
});
const REJECTED = certificate({
	id: 'cert-rejected',
	language_id: 'fr-FR',
	language_name: 'Francês (França)',
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

async function mockAdminApi(page: Page, initial: TranslatorCertificate[]) {
	let certificates = [...initial];
	const languages: object[] = [];
	const reviews: unknown[] = [];

	// NENHUMA CHAMADA CHEGA AO BACKEND REAL: O QUE NAO FOR SIMULADO E ABORTADO
	await page.context().route(/localhost:(3333|8000)/, (route) => route.abort());
	await page.route(`**/api/translators/${TRANSLATOR_ID}`, (route) =>
		route.fulfill(
			json({
				id: TRANSLATOR_ID,
				name: 'Operador Tradutor',
				email: 'operador@spaceline.com.br',
				phone: '11988887777',
				is_active: true,
				created_at: '2026-10-01T00:00:00Z',
				updated_at: '2026-10-01T00:00:00Z',
				qualifications: [],
				languages,
			}),
		),
	);
	await page.route(
		`**/api/translators/${TRANSLATOR_ID}/certificates`,
		(route) => route.fulfill(json(certificates)),
	);
	await page.route('**/certificates/*/file', (route) =>
		route.fulfill(json({ url: SIGNED_URL, expires_in: 300 })),
	);
	await page
		.context()
		.route(SIGNED_URL, (route) =>
			route.fulfill({ status: 200, contentType: 'text/plain', body: 'pdf' }),
		);
	await page.route('**/certificates/*/review', async (route) => {
		const body = route.request().postDataJSON() as {
			status: 'approved' | 'rejected';
			review_note?: string;
		};
		reviews.push(body);
		const id = route.request().url().split('/certificates/')[1].split('/')[0];
		const current = certificates.find((item) => item.id === id);
		if (!current) return route.fulfill(json({ detail: 'não encontrado' }, 404));

		const updated: TranslatorCertificate = {
			...current,
			status: body.status,
			review_note: body.review_note ?? null,
			reviewed_at: '2026-10-22T12:00:00Z',
		};
		certificates = certificates.map((item) =>
			item.id === id ? updated : item,
		);
		if (body.status === 'approved') {
			languages.push({
				id: `tl-${id}`,
				language_id: current.language_id,
				language_name: current.language_name,
				proficiency_level: current.proficiency_level,
			});
		}
		return route.fulfill(json(updated));
	});
	return reviews;
}

async function openRequestsTab(page: Page) {
	await loginAsAdmin(page);
	await page.goto(`/tradutores/${TRANSLATOR_ID}`);
	await page.getByText('Solicitações', { exact: true }).click();
}

test('aba Solicitações mostra a quantidade de certificados pendentes', async ({
	page,
}) => {
	await mockAdminApi(page, [PENDING, SECOND_PENDING, APPROVED]);
	await loginAsAdmin(page);
	await page.goto(`/tradutores/${TRANSLATOR_ID}`);

	await expect(page.getByLabel('Solicitações, 2 pendentes')).toBeVisible();
});

test('aprova o certificado e o idioma passa a fazer parte do perfil', async ({
	page,
}) => {
	const reviews = await mockAdminApi(page, [PENDING]);
	await openRequestsTab(page);

	await page.getByLabel(/Solicitação de Árabe \(Egito\)/).click();
	await expect(page.getByText('Aguardando avaliação').first()).toBeVisible();
	await page.getByText('Aprovar', { exact: true }).click();

	await expect(page.getByText('Aprovar certificado?')).toBeVisible();
	await page.getByText('Aprovar', { exact: true }).click();

	await expect(
		page.getByText(/Certificado aprovado\. Árabe \(Egito\) foi adicionado/),
	).toBeVisible();
	expect(reviews).toEqual([{ status: 'approved' }]);
	await expect(page.getByLabel('Solicitações, 1 pendentes')).toHaveCount(0);

	await page.getByText('Idiomas e fluência', { exact: true }).click();
	await expect(page.getByText('Árabe (Egito)', { exact: true })).toBeVisible();
});

test('recusar exige o motivo antes de enviar', async ({ page }) => {
	const reviews = await mockAdminApi(page, [PENDING]);
	await openRequestsTab(page);

	await page.getByLabel(/Solicitação de Árabe \(Egito\)/).click();
	await page.getByText('Recusar', { exact: true }).click();
	await expect(page.getByText('Recusar certificado')).toBeVisible();

	const confirm = page.getByRole('button', { name: 'Recusar' });
	await expect(confirm).toBeDisabled();

	await page.getByLabel('Motivo da recusa').fill('Documento ilegível');
	await confirm.click();

	await expect(
		page.getByText(/Certificado recusado\. O tradutor/),
	).toBeVisible();
	expect(reviews).toEqual([
		{ status: 'rejected', review_note: 'Documento ilegível' },
	]);
});

test('certificado aprovado só permite visualizar o documento', async ({
	page,
}) => {
	await mockAdminApi(page, [APPROVED]);
	await openRequestsTab(page);

	await page.getByLabel(/Solicitação de Espanhol/).click();

	await expect(page.getByText('Certificado aprovado')).toBeVisible();
	await expect(page.getByText('Visualizar documento')).toBeVisible();
	await expect(page.getByText('Aprovar', { exact: true })).toHaveCount(0);
	await expect(page.getByText('Recusar', { exact: true })).toHaveCount(0);
});

test('certificado recusado mostra o motivo e só permite visualizar', async ({
	page,
}) => {
	await mockAdminApi(page, [REJECTED]);
	await openRequestsTab(page);

	await page.getByLabel(/Solicitação de Francês/).click();

	await expect(page.getByText('Motivo da recusa:')).toBeVisible();
	await expect(page.getByText('Aprovar', { exact: true })).toHaveCount(0);
});

test('visualiza o arquivo por link temporário', async ({ page }) => {
	await mockAdminApi(page, [PENDING]);
	await openRequestsTab(page);
	await page.getByLabel(/Solicitação de Árabe \(Egito\)/).click();

	const signedRequest = page
		.context()
		.waitForEvent('request', (request) => request.url() === SIGNED_URL);
	await page.getByText('Visualizar documento').click();

	expect((await signedRequest).url()).toBe(SIGNED_URL);
	await expect(page.getByText('Abrir em nova aba')).toBeVisible();
});

test('sem solicitações exibe estado vazio', async ({ page }) => {
	await mockAdminApi(page, []);
	await openRequestsTab(page);

	await expect(
		page.getByText('Nenhuma solicitação de certificado.'),
	).toBeVisible();
});
