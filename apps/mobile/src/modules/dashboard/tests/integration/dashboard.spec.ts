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

const SUBTITLE =
	'Acompanhe suas principais métricas e acesse rapidamente as ações do seu perfil.';

const isoDaysAgo = (days: number) =>
	new Date(Date.now() - days * 86_400_000).toISOString();

const quotesPage = (items: unknown[]) =>
	JSON.stringify({
		items,
		total: items.length,
		page: 1,
		page_size: 10,
		total_pages: 1,
	});

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
		await page.route(/\/api\/requests/, (route) =>
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

		await expect(page.getByText(SUBTITLE)).toBeVisible();
		await expect(page.getByText('Acesso Rápido', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: /^Acessar / })).toHaveCount(2);

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

	for (const roleName of ['Administrador']) {
		test(`exibe todos os atalhos disponíveis para perfil ${roleName}`, async ({
			page,
		}) => {
			await setupSession(page, ['dashboard.read'], roleName);
			await page.goto('/dashboard');

			await expect(page.getByRole('button', { name: /^Acessar / })).toHaveCount(7);

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

		await expect(page.getByText(SUBTITLE)).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Acessar Requisições' }),
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Acessar Orçamento' }),
		).toBeVisible();
	});

	test('exibe quantidade e valor por status na Visão Geral', async ({
		page,
	}) => {
		await page.route(/\/api\/quotes/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: quotesPage([
					{ status: 'pending', total_value: '1500.00', created_at: isoDaysAgo(1) },
					{ status: 'approved', total_value: '2500.50', created_at: isoDaysAgo(1) },
				]),
			}),
		);
		await setupSession(page, ['dashboard.read'], 'Administrador');
		await page.goto('/dashboard');

		await expect(page.getByRole('tab', { name: 'Orçamentos' })).toBeVisible();
		for (const label of ['Em aberto', 'Aprovados', 'Reprovados']) {
			await expect(page.getByText(label, { exact: true })).toBeVisible();
		}
		// total do grupo e valor de cada status
		await expect(page.getByText(/R\$\s*4\.000,50/).first()).toBeVisible();
		await expect(page.getByText(/R\$\s*1\.500,00/)).toBeVisible();
		await expect(page.getByText(/R\$\s*2\.500,50/)).toBeVisible();
	});

	test('atualiza cards e gráfico ao trocar o período', async ({ page }) => {
		await page.route(/\/api\/quotes/, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: quotesPage([
					{ status: 'pending', total_value: '1000.00', created_at: isoDaysAgo(20) },
					{ status: 'approved', total_value: '2000.00', created_at: isoDaysAgo(1) },
				]),
			}),
		);
		await setupSession(page, ['dashboard.read'], 'Administrador');
		await page.goto('/dashboard');

		// período padrão (30 dias) inclui os dois orçamentos
		await expect(page.getByText(/R\$\s*3\.000,00/).first()).toBeVisible();

		await page.getByRole('tab', { name: 'Período: 7 dias' }).click();

		await expect(page.getByText(/R\$\s*3\.000,00/)).toHaveCount(0);
		await expect(page.getByText(/R\$\s*2\.000,00/).first()).toBeVisible();
	});

	test('informa ausência de resultados quando não há dados no período', async ({
		page,
	}) => {
		await setupSession(page, ['dashboard.read'], 'Administrador');
		await page.goto('/dashboard');

		await expect(page.getByText('Nenhum registro no período')).toBeVisible();
	});

	test('exibe erro da Visão Geral e permite nova tentativa', async ({
		page,
	}) => {
		let shouldFail = true;
		await page.route(/\/api\/quotes/, (route) => {
			if (shouldFail) {
				return route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ detail: 'Falha ao consultar orçamentos.' }),
				});
			}
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: quotesPage([
					{ status: 'approved', total_value: '900.00', created_at: isoDaysAgo(1) },
				]),
			});
		});
		await setupSession(page, ['dashboard.read', 'quotes.read']);
		await page.goto('/dashboard');

		await expect(
			page.getByText('Não foi possível carregar os dados do período'),
		).toBeVisible();
		// o Acesso Rápido continua disponível mesmo com a Visão Geral em erro
		await expect(
			page.getByRole('button', { name: 'Acessar Orçamento' }),
		).toBeVisible();

		shouldFail = false;
		await page.getByRole('button', { name: 'Tentar novamente' }).click();

		await expect(
			page.getByText('Não foi possível carregar os dados do período'),
		).not.toBeVisible();
		await expect(page.getByText(/R\$\s*900,00/).first()).toBeVisible();
	});

	test('não exibe filtro de período para perfil sem acesso aos indicadores', async ({
		page,
	}) => {
		await setupSession(page, ['dashboard.read', 'clients.read']);
		await page.goto('/dashboard');

		await expect(
			page.getByRole('button', { name: 'Acessar Clientes' }),
		).toBeVisible();
		await expect(
			page.getByRole('tab', { name: 'Período: 7 dias' }),
		).toHaveCount(0);
	});
});