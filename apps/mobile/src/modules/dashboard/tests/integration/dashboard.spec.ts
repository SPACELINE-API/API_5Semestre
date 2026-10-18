import { expect, test } from '@playwright/test';

const sessionCookie = encodeURIComponent(
	JSON.stringify({
		access_token: 'dashboard-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'test-user-id', email: 'usuario@example.com' },
	}),
);

async function setupSession(
	page: import('@playwright/test').Page,
	permissions: string[] = ['dashboard.read'],
	roleName = 'Usuário',
) {
	await page.context().addCookies([
		{
			name: 'spaceline_session',
			value: sessionCookie,
			url: 'http://127.0.0.1:5183',
		},
	]);
	await page.route(/\/api\/auth\/me/, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: { id: 'test-user-id', email: 'usuario@example.com' },
				roles: [{ id: 'role-1', name: roleName }],
				permissions,
			}),
		}),
	);
}

test.describe('Painel inicial (Dashboard)', () => {
	test.beforeEach(async ({ page }) => {
		await page.route(/\/api\/quotes/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ total: 0, items: [] }),
			}),
		);
		await page.route(/\/api\/service-orders/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
		await page.route(/\/api\/clients/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
		await page.route(/\/api\/translators/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: '[]',
			}),
		);
	});

	test('exibe indicador de carregamento enquanto busca dados do painel', async ({
		page,
	}) => {
		await page.context().addCookies([
			{
				name: 'spaceline_session',
				value: sessionCookie,
				url: 'http://127.0.0.1:5183',
			},
		]);
		let fulfillMe: () => void = () => {};
		const mePromise = new Promise<void>((resolve) => {
			fulfillMe = resolve;
		});

		let callCount = 0;
		await page.route(/\/api\/auth\/me/, async (route) => {
			callCount++;
			if (callCount === 1) {
				return route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						user: { id: 'test-user-id', email: 'usuario@example.com' },
						roles: [{ id: 'role-1', name: 'Usuário' }],
						permissions: ['dashboard.read', 'requests.read'],
					}),
				});
			}
			await mePromise;
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					user: { id: 'test-user-id', email: 'usuario@example.com' },
					roles: [{ id: 'role-1', name: 'Usuário' }],
					permissions: ['dashboard.read', 'requests.read'],
				}),
			});
		});

		await page.goto('/dashboard');
		await expect(
			page.getByText('Carregando informações do painel...'),
		).toBeVisible();

		fulfillMe();
		await expect(
			page.getByText('Carregando informações do painel...'),
		).not.toBeVisible();
		await expect(page.getByText('Requisições').first()).toBeVisible();
	});

	test('exibe apenas os atalhos autorizados para o perfil do usuário', async ({
		page,
	}) => {
		await setupSession(page, [
			'dashboard.read',
			'requests.read',
			'quotes.read',
		]);
		await page.goto('/dashboard');

		await expect(page.getByText('Olá, usuario!')).toBeVisible();
		await expect(page.getByText('2 módulos disponíveis')).toBeVisible();

		await expect(page.getByText('Requisições').first()).toBeVisible();
		await expect(page.getByText('Orçamento').first()).toBeVisible();

		await expect(
			page.getByText('Tarefas atribuídas', { exact: true }),
		).toHaveCount(0);
		await expect(page.getByText('Clientes', { exact: true })).toHaveCount(0);
		await expect(page.getByText('Tradutores', { exact: true })).toHaveCount(0);
	});

	test('navega para o módulo correspondente ao acionar um atalho', async ({
		page,
	}) => {
		await setupSession(page, ['dashboard.read', 'requests.read']);
		await page.goto('/dashboard');

		const shortcutCard = page.getByRole('button', {
			name: 'Acessar Requisições',
		});
		await expect(shortcutCard).toBeVisible();
		await shortcutCard.click();

		await expect(page).toHaveURL(/\/visualizar-requisicoes$/);
	});

	test('exibe mensagem amigável quando o usuário não possui atalhos autorizados', async ({
		page,
	}) => {
		await setupSession(page, ['dashboard.read']);
		await page.goto('/dashboard');

		await expect(page.getByText('Nenhuma ação disponível')).toBeVisible();
		await expect(
			page.getByText(
				'Seu perfil não possui permissões ativas para acessar os módulos do sistema.',
			),
		).toBeVisible();
		await expect(page.getByText('Acessar módulo')).toHaveCount(0);
	});

	test('trata erro no carregamento e recupera o painel ao acionar nova tentativa', async ({
		page,
	}) => {
		await page.context().addCookies([
			{
				name: 'spaceline_session',
				value: sessionCookie,
				url: 'http://127.0.0.1:5183',
			},
		]);

		let shouldFail = true;
		let callCount = 0;
		await page.route(/\/api\/auth\/me/, (route) => {
			callCount++;
			if (callCount === 1) {
				return route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						user: { id: 'test-user-id', email: 'usuario@example.com' },
						roles: [{ id: 'role-1', name: 'Usuário' }],
						permissions: ['dashboard.read', 'requests.read'],
					}),
				});
			}
			if (shouldFail) {
				return route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ detail: 'Falha interna no servidor.' }),
				});
			}
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					user: { id: 'test-user-id', email: 'usuario@example.com' },
					roles: [{ id: 'role-1', name: 'Usuário' }],
					permissions: ['dashboard.read', 'requests.read'],
				}),
			});
		});

		await page.goto('/dashboard');

		await expect(
			page.getByText('Não foi possível carregar o painel'),
		).toBeVisible();
		await expect(page.getByText('Falha interna no servidor.')).toBeVisible();

		const retryButton = page.getByRole('button', {
			name: 'Tentar novamente',
		});
		await expect(retryButton).toBeVisible();

		shouldFail = false;
		await retryButton.click();

		await expect(
			page.getByText('Não foi possível carregar o painel'),
		).not.toBeVisible();
		await expect(page.getByText('Requisições').first()).toBeVisible();
	});

	for (const roleName of ['Administrador', 'Operador']) {
		test(`exibe todos os atalhos disponíveis para perfil ${roleName}`, async ({
			page,
		}) => {
			await setupSession(page, ['dashboard.read'], roleName);
			await page.goto('/dashboard');

			await expect(page.getByText('7 módulos disponíveis')).toBeVisible();

			for (const title of [
				'Tarefas atribuídas',
				'Requisições',
				'Orçamento',
				'Ordem de serviço',
				'Clientes',
				'Tradutores',
				'Suporte',
			]) {
				await expect(page.getByText(title).first()).toBeVisible();
			}
		});
	}

	test('garante funcionamento responsivo em viewport mobile', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await setupSession(page, [
			'dashboard.read',
			'requests.read',
			'quotes.read',
		]);
		await page.goto('/dashboard');

		await expect(page.getByText('Olá, usuario!')).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Acessar Requisições' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Acessar Orçamento' }),
		).toBeVisible();
	});
});
