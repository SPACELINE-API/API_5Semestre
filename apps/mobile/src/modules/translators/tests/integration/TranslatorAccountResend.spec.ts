import { expect, test, type Page } from '@playwright/test';
import type { Translator, TranslatorAccount } from '../../types/translator';
import { loginAsAdmin } from './authHelper';

const SESSION_COOKIE = 'spaceline_session';
const HOUR = 60 * 60 * 1000;

function json(body: unknown, status = 200) {
	return {
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	};
}

function account(
	overrides: Partial<TranslatorAccount> = {},
): TranslatorAccount {
	const sent = new Date(Date.now() - 2 * HOUR);
	return {
		user_id: 'user-id',
		status: 'inativa',
		password_defined: false,
		latest_link: {
			status: 'pendente',
			sent_at: sent.toISOString(),
			expires_at: new Date(sent.getTime() + 72 * HOUR).toISOString(),
			used_at: null,
		},
		...overrides,
	};
}

function translator(
	id: string,
	name: string,
	translatorAccount: TranslatorAccount | null,
): Translator {
	return {
		id,
		name,
		email: `${id}@example.com`,
		phone: '11988887777',
		is_active: true,
		created_at: '2026-11-10T13:00:00Z',
		updated_at: '2026-11-10T13:00:00Z',
		qualifications: [],
		languages: [],
		account: translatorAccount,
	};
}

const PENDING = translator('joana', 'Joana Pendente', account());
const EXPIRED = translator(
	'pedro',
	'Pedro Expirado',
	account({
		latest_link: {
			status: 'expirado',
			sent_at: new Date(Date.now() - 80 * HOUR).toISOString(),
			expires_at: new Date(Date.now() - 8 * HOUR).toISOString(),
			used_at: null,
		},
	}),
);
const ACTIVE = translator(
	'ana',
	'Ana Ativa',
	account({
		status: 'ativa',
		password_defined: true,
		latest_link: {
			status: 'aceito',
			sent_at: '2026-11-10T13:00:00Z',
			expires_at: '2026-11-13T13:00:00Z',
			used_at: '2026-11-10T14:00:00Z',
		},
	}),
);
const LEGACY = translator('legado', 'Tradutor Antigo', null);

// NENHUMA CHAMADA CHEGA AO BACKEND REAL: O QUE NAO FOR SIMULADO E ABORTADO
async function mockApi(page: Page, options: { failResend?: boolean } = {}) {
	let translators = [PENDING, EXPIRED, ACTIVE, LEGACY];
	const resent: string[] = [];

	await page.context().route(/localhost:(3333|8000)/, (route) => route.abort());
	await page.route(/\/api\/translators(\?.*)?$/, (route) =>
		route.fulfill(json(translators)),
	);
	await page.route(
		'**/api/translators/*/password-setup-link/resend',
		(route) => {
			const id = new URL(route.request().url()).pathname.split('/')[3];
			if (options.failResend) {
				return route.fulfill(
					json({ detail: 'Não foi possível enviar o e-mail com o link' }, 502),
				);
			}
			resent.push(id);
			const now = new Date();
			translators = translators.map((item) =>
				item.id === id
					? {
							...item,
							account: account({
								latest_link: {
									status: 'pendente',
									sent_at: now.toISOString(),
									expires_at: new Date(now.getTime() + 72 * HOUR).toISOString(),
									used_at: null,
								},
							}),
						}
					: item,
			);
			return route.fulfill(json(translators.find((item) => item.id === id)));
		},
	);

	return { resent };
}

async function openTranslators(page: Page) {
	await loginAsAdmin(page);
	await page.goto('/tradutores');
	await expect(page.getByText('Joana Pendente').first()).toBeVisible();
}

test('lista os tradutores que aguardam a definição de senha', async ({
	page,
}) => {
	await mockApi(page);
	await openTranslators(page);

	await expect(
		page.getByText('2 tradutores aguardando a definição de senha'),
	).toBeVisible();
	await expect(page.getByText(/Expira em 2 dias/)).toBeVisible();
	await expect(page.getByText(/Expirou há/)).toBeVisible();
	await expect(
		page.getByLabel('Reenviar link para Joana Pendente'),
	).toBeVisible();
	await expect(
		page.getByLabel('Reenviar link para Pedro Expirado'),
	).toBeVisible();
	// CONTA ATIVA E TRADUTOR SEM CONTA NAO TEM O QUE REENVIAR
	await expect(page.getByLabel('Reenviar link para Ana Ativa')).toHaveCount(0);
	await expect(
		page.getByLabel('Reenviar link para Tradutor Antigo'),
	).toHaveCount(0);
	await expect(page.getByText('Aguardando senha')).toHaveCount(2);
});

test('reenvia o link mesmo depois de expirado', async ({ page }) => {
	const api = await mockApi(page);
	await openTranslators(page);

	await page.getByLabel('Reenviar link para Pedro Expirado').click();

	await expect(
		page.getByText('Link reenviado para pedro@example.com.'),
	).toBeVisible();
	expect(api.resent).toEqual(['pedro']);
	await expect(page.getByText(/Expirou há/)).toHaveCount(0);
	await expect(page.getByText(/Expira em/)).toHaveCount(2);
});

test('exibe o erro quando o reenvio falha', async ({ page }) => {
	await mockApi(page, { failResend: true });
	await openTranslators(page);

	await page.getByLabel('Reenviar link para Joana Pendente').click();

	await expect(
		page.getByText('Não foi possível enviar o e-mail com o link'),
	).toBeVisible();
});

test('quem não tem translators.write não consegue reenviar', async ({
	page,
}) => {
	await mockApi(page);
	await page.route('**/api/auth/me', (route) =>
		route.fulfill(
			json({
				user: { id: 'reader-id', email: 'leitura@spaceline.com.br' },
				roles: [{ id: 'projetos', name: 'Projetos' }],
				permissions: ['translators.read', 'dashboard.read'],
			}),
		),
	);
	await page.goto('/login');
	await page.evaluate(
		(value) => {
			document.cookie = `${value.name}=${value.encoded}; path=/; SameSite=Lax`;
		},
		{
			name: SESSION_COOKIE,
			encoded: encodeURIComponent(
				JSON.stringify({
					access_token: 'reader-token',
					token_type: 'bearer',
					expires_in: 3600,
					user: {
						id: 'reader-id',
						email: 'leitura@spaceline.com.br',
						role: 'interno',
					},
				}),
			),
		},
	);
	await page.goto('/tradutores');

	await expect(
		page.getByLabel('Reenviar link para Joana Pendente'),
	).toBeDisabled();
});
