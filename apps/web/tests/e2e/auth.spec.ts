import { expect, type Page, test } from '@playwright/test';

const loginEmail = 'usuario@exemplo.com';
const loginPassword = 'senha-segura';

async function openLogin(page: Page) {
	await page.goto('/login');
	await expect(page.getByText('Permitir cookies no site')).toBeVisible();
}

async function acceptCookies(page: Page) {
	const acceptButton = page.getByText('Aceitar', { exact: true });
	if (await acceptButton.isVisible()) {
		await acceptButton.click();
	}
}

test.describe('autenticação web', () => {
	test('exibe novamente o modal quando os cookies são recusados', async ({
		page,
	}) => {
		await openLogin(page);
		await page.getByText('Recusar', { exact: true }).click();
		await expect(page.getByText('Permitir cookies no site')).toBeHidden();

		await page.reload();
		await expect(page.getByText('Permitir cookies no site')).toBeVisible();
	});

	test('não solicita novamente o consentimento depois de aceitar', async ({
		page,
	}) => {
		await openLogin(page);
		await page.getByText('Aceitar', { exact: true }).click();
		await expect(page.getByText('Permitir cookies no site')).toBeHidden();

		await page.reload();
		await expect(page.getByText('Permitir cookies no site')).toBeHidden();
	});

	test('alterna a visibilidade da senha e mantém o checkbox de lembrar-me', async ({
		page,
	}) => {
		await openLogin(page);
		await acceptCookies(page);

		const password = page.getByPlaceholder('••••••••');
		await password.fill(loginPassword);
		await expect(password).toHaveJSProperty('type', 'password');
		await page.getByRole('button', { name: 'Mostrar senha' }).click();
		await expect(password).toHaveJSProperty('type', 'text');

		const remember = page.getByRole('checkbox', { name: 'Lembrar-me' });
		await remember.click();
		await expect(remember.locator('svg')).toBeVisible();
	});

	test('envia o login com Enter e redireciona para o dashboard', async ({
		page,
	}) => {
		await page.route('**/api/auth/login', async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					access_token: 'e2e-token',
					token_type: 'bearer',
					expires_in: 3600,
					user: { id: 'e2e-user', email: loginEmail },
				}),
			});
		});

		await openLogin(page);
		await acceptCookies(page);
		await page.getByPlaceholder('seuemail@exemplo.com').fill(loginEmail);
		await page.getByPlaceholder('••••••••').fill(loginPassword);
		await page.getByPlaceholder('••••••••').press('Enter');

		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByText('Requisições')).toBeVisible();
	});

	test('exige um novo e-mail na recuperação e exibe a confirmação de envio', async ({
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

		await openLogin(page);
		await acceptCookies(page);
		await page
			.getByPlaceholder('seuemail@exemplo.com')
			.fill('login@exemplo.com');
		await page.getByText('Esqueci minha senha').click();

		const recoveryEmail = page.getByPlaceholder('Digite seu e-mail');
		await expect(recoveryEmail).toHaveValue('');
		await recoveryEmail.fill('recuperacao@exemplo.com');
		await page.getByText('ENVIAR LINK').click();

		await expect(
			page.getByText('E-mail enviado para o destinatário.'),
		).toBeVisible();
		expect(requestBody.email).toBe('recuperacao@exemplo.com');
	});

	test('alterna os dois campos de senha da recuperação', async ({ page }) => {
		await page.goto('/login#access_token=e2e-token&type=recovery');
		await expect(page.getByText('Permitir cookies no site')).toBeVisible();
		await acceptCookies(page);

		const newPassword = page.getByPlaceholder('Digite sua nova senha');
		const confirmation = page.getByPlaceholder('Digite a senha novamente');
		await expect(newPassword).toHaveJSProperty('type', 'password');
		await expect(confirmation).toHaveJSProperty('type', 'password');

		await page.getByRole('button', { name: 'Mostrar nova senha' }).click();
		await page
			.getByRole('button', { name: 'Mostrar confirmação da senha' })
			.click();
		await expect(newPassword).toHaveJSProperty('type', 'text');
		await expect(confirmation).toHaveJSProperty('type', 'text');
	});
});
