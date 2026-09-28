import { expect, test } from '@playwright/test';

test.describe('autenticação mobile unificada', () => {
	test('exibe o login sem exigir consentimento de cookies', async ({
		page,
	}) => {
		await page.goto('/login');

		await expect(page.getByRole('button', { name: 'ENTRAR' })).toBeVisible();
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
		await page.getByRole('button', { name: 'ENVIAR LINK' }).click();
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
		await page.getByRole('button', { name: 'ATUALIZAR SENHA' }).click();
		await expect(page.getByText('Senha atualizada com sucesso.')).toBeVisible();
		expect(requestBody.access_token).toBe('mobile-token');
	});
});
