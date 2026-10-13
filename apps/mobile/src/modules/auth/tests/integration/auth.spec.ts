import { expect, test } from '@playwright/test';

const externalSession = encodeURIComponent(
	JSON.stringify({
		access_token: 'external-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'external-user', email: 'externo@example.com' },
	}),
);

async function useExternalProfile(
	page: import('@playwright/test').Page,
	permissions = ['requests.read', 'documents.read'],
) {
	await page.context().addCookies([
		{
			name: 'spaceline_session',
			value: externalSession,
			url: 'http://127.0.0.1:5183',
		},
	]);
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: { id: 'external-user', email: 'externo@example.com' },
				roles: [{ id: 'external', name: 'Recursos externos' }],
				permissions,
			}),
		}),
	);
}

test.describe('autenticação mobile unificada', () => {
	test('oculta orçamento e bloqueia acesso direto para perfil sem quotes.read', async ({
		page,
	}) => {
		await useExternalProfile(page);
		await page.goto('/visualizar-requisicoes');
		await expect(page.getByText('Orçamento', { exact: true })).toHaveCount(0);
		await expect(
			page.getByText('Tarefas atribuídas', { exact: true }),
		).toHaveCount(0);
		await page.goto('/orcamento/novo-orcamento');
		await expect(page).toHaveURL(/\/visualizar-requisicoes$/);
	});

	test('protege dashboard, convites e rotas privadas desconhecidas', async ({
		page,
	}) => {
		await useExternalProfile(page, ['dashboard.read', 'assignments.read']);
		await page.goto('/convites/test-invite');
		await expect(
			page.getByText('Tarefas atribuídas', { exact: true }),
		).toBeVisible();
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/dashboard$/);
		await page.goto('/rota-inexistente');
		await expect(page).toHaveURL(/\/dashboard$/);
	});

	test('mantém a rota pública de solicitação sem sessão', async ({ page }) => {
		await page.goto('/solicitar-servico');
		await expect(page).not.toHaveURL(/\/login/);
	});

	test('exibe o login sem exigir consentimento de cookies', async ({
		page,
	}) => {
		await page.goto('/login');

		await expect(page.getByText('ENTRAR', { exact: true })).toBeVisible();
		await expect(page.getByText('Permitir cookies no site')).not.toBeVisible();
	});

	test('solicita recuperação de senha e exibe confirmação', async ({
		page,
	}) => {
		let requestBody: { email?: string } = {};
		await page.route('**/api/auth/password-recovery', async (route) => {
			requestBody = route.request().postDataJSON() as { email?: string };
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'E-mail enviado para o destinatário.',
				}),
			});
		});
		await page.goto('/login');
		await page.getByText('Esqueci minha senha').click();
		await page
			.getByPlaceholder('Digite seu e-mail')
			.fill('recuperacao@exemplo.com');
		await page.getByText('ENVIAR LINK', { exact: true }).click();
		await expect(
			page.getByText('E-mail enviado para o destinatário.'),
		).toBeVisible();
		expect(requestBody.email).toBe('recuperacao@exemplo.com');
	});

	test('redefine a senha usando o token recebido', async ({ page }) => {
		let requestBody: Record<string, string> = {};
		await page.route('**/api/auth/password-reset', async (route) => {
			requestBody = route.request().postDataJSON() as Record<string, string>;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ message: 'Senha atualizada com sucesso.' }),
			});
		});
		await page.goto('/login#access_token=mobile-token&type=recovery');
		await page.getByPlaceholder('Digite sua nova senha').fill('nova-senha');
		await page.getByPlaceholder('Digite a senha novamente').fill('nova-senha');
		await page.getByText('ATUALIZAR SENHA', { exact: true }).click();
		await expect(page.getByText('Senha atualizada com sucesso.')).toBeVisible();
		expect(requestBody.access_token).toBe('mobile-token');
	});
});
