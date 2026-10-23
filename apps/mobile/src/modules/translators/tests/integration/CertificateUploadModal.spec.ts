import { expect, test, type Page } from '@playwright/test';
import { loginAsTranslator } from './authHelper';

const PDF = Buffer.from(`%PDF-1.7\n${'0'.repeat(2048)}\n%%EOF\n`);

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
	languages: [
		{
			id: 'translator-language-1',
			language_id: 'pt-BR',
			language_name: 'Português (Brasil)',
			proficiency_level: 'native',
		},
	],
};

const LANGUAGES = [
	{ id: 'de-DE', name: 'Alemão' },
	{ id: 'es-ES', name: 'Espanhol (Espanha)' },
];

const CERTIFICATE = {
	id: 'certificate-1',
	translator_id: 'translator-1',
	language_id: 'es-ES',
	language_name: 'Espanhol (Espanha)',
	proficiency_level: 'advanced',
	filename: 'certificado-dele.pdf',
	content_type: 'application/pdf',
	size_bytes: PDF.length,
	status: 'pending',
	review_note: null,
	reviewed_at: null,
	created_at: '2026-10-18T21:00:00Z',
	updated_at: '2026-10-18T21:00:00Z',
};

function json(body: unknown, status = 200) {
	return {
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	};
}

async function mockProfileApi(
	page: Page,
	submitResponse: { status: number; body: unknown },
) {
	const submitted: string[] = [];
	await page.route('**/api/translators/me', (route) =>
		route.fulfill(json(PROFILE)),
	);
	await page.route('**/api/translators/me/certificates/languages', (route) =>
		route.fulfill(json(LANGUAGES)),
	);
	await page.route('**/api/translators/me/certificates', (route) => {
		if (route.request().method() === 'GET') return route.fulfill(json([]));
		submitted.push(route.request().postData() ?? '');
		return route.fulfill(json(submitResponse.body, submitResponse.status));
	});
	return submitted;
}

async function dropFile(page: Page, name: string, bytes: Buffer, type: string) {
	const dataTransfer = await page.evaluateHandle(
		({ name, bytes, type }) => {
			const transfer = new DataTransfer();
			transfer.items.add(new File([new Uint8Array(bytes)], name, { type }));
			return transfer;
		},
		{ name, bytes: [...bytes], type },
	);
	const dropzone = /Arraste o arquivo para cá|Solte o arquivo|Trocar arquivo/;
	await page.getByText(dropzone).first().dispatchEvent('dragenter', {
		dataTransfer,
	});
	await page.getByText(dropzone).first().dispatchEvent('drop', {
		dataTransfer,
	});
}

async function openCertificateModal(page: Page) {
	await loginAsTranslator(page);
	await page.goto('/meu-perfil');
	await page.getByText('Certificados', { exact: true }).click();
	await page.getByText('Novo certificado').click();
	await expect(
		page.getByText('Envie o certificado que comprova o seu novo idioma'),
	).toBeVisible();
}

async function fillCertificate(page: Page) {
	await page.getByLabel('Selecionar idioma').click();
	await page.getByText('Espanhol (Espanha)').click();
	await page.getByText('Avançado', { exact: true }).click();
	await dropFile(page, 'certificado-dele.pdf', PDF, 'application/pdf');
	await expect(page.getByText('certificado-dele.pdf')).toBeVisible();
}

test('envia o certificado do idioma informado e exibe mensagem de sucesso', async ({
	page,
}) => {
	const submitted = await mockProfileApi(page, {
		status: 201,
		body: CERTIFICATE,
	});
	await openCertificateModal(page);

	await expect(page.getByText('Enviar', { exact: true })).toBeVisible();
	await fillCertificate(page);
	await page.getByText('Enviar', { exact: true }).click();

	await expect(page.getByText('Certificado enviado')).toBeVisible();
	expect(submitted).toHaveLength(1);
	expect(submitted[0]).toContain('es-ES');
	expect(submitted[0]).toContain('advanced');

	await page.getByText('OK', { exact: true }).click();
	await expect(page.getByText('Certificado enviado')).toHaveCount(0);
});

test('troca o arquivo selecionado sem pedir confirmação em um certificado novo', async ({
	page,
}) => {
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);
	await fillCertificate(page);

	await dropFile(page, 'novo-certificado.pdf', PDF, 'application/pdf');

	await expect(page.getByText('Substituir arquivo?')).toHaveCount(0);
	await expect(page.getByText('novo-certificado.pdf')).toBeVisible();
	await expect(page.getByText('certificado-dele.pdf')).toHaveCount(0);
});

test('campo de busca de idioma não exibe borda de foco', async ({ page }) => {
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);
	await page.getByLabel('Selecionar idioma').click();

	const search = page.getByLabel('Buscar idioma');
	await search.focus();

	// OUTLINE-NONE DO TAILWIND DEIXA O CONTORNO TRANSPARENTE (NAO VISIVEL)
	await expect(search).toHaveCSS('outline-color', 'rgba(0, 0, 0, 0)');
});

test('rejeita arquivo inválido informando o motivo sem perder o preenchimento', async ({
	page,
}) => {
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);
	await fillCertificate(page);

	await dropFile(page, 'foto.gif', Buffer.from('GIF89a000'), 'image/gif');
	await expect(
		page.getByText('Formato inválido para certificado'),
	).toBeVisible();
	await page.getByText('Voltar', { exact: true }).click();

	await expect(page.getByText('certificado-dele.pdf')).toBeVisible();
	await expect(page.getByText('Espanhol (Espanha)')).toBeVisible();
});

test('aceita somente um arquivo por vez', async ({ page }) => {
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);

	const dataTransfer = await page.evaluateHandle(() => {
		const transfer = new DataTransfer();
		transfer.items.add(new File(['a'], 'a.pdf', { type: 'application/pdf' }));
		transfer.items.add(new File(['b'], 'b.pdf', { type: 'application/pdf' }));
		return transfer;
	});
	await page
		.getByText('Arraste o arquivo para cá')
		.dispatchEvent('drop', { dataTransfer });

	await expect(
		page.getByText('Envie apenas um arquivo por vez.'),
	).toBeVisible();
});

test('exibe o erro retornado pelo servidor', async ({ page }) => {
	await mockProfileApi(page, {
		status: 502,
		body: {
			detail: 'Não foi possível armazenar o certificado. Tente novamente.',
		},
	});
	await openCertificateModal(page);
	await fillCertificate(page);
	await page.getByText('Enviar', { exact: true }).click();

	await expect(
		page.getByText(
			'Não foi possível armazenar o certificado. Tente novamente.',
		),
	).toBeVisible();
});

test('mantém o modal utilizável em tela estreita', async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 740 });
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);

	await expect(page.getByText('Importar documento')).toBeInViewport();
	await expect(page.getByText('Enviar', { exact: true })).toBeInViewport();
});

test('avisa o que falta quando o arquivo é anexado sem idioma e proficiência', async ({
	page,
}) => {
	await mockProfileApi(page, { status: 201, body: CERTIFICATE });
	await openCertificateModal(page);

	await dropFile(page, 'certificado-dele.pdf', PDF, 'application/pdf');
	await expect(
		page.getByText('Selecione o idioma e a proficiência para enviar.'),
	).toBeVisible();

	await page.getByLabel('Selecionar idioma').click();
	await page.getByText('Espanhol (Espanha)').click();
	await expect(
		page.getByText('Selecione a proficiência para enviar.'),
	).toBeVisible();

	await page.getByText('Avançado', { exact: true }).click();
	await expect(page.getByText(/para enviar\./)).toHaveCount(0);
});
