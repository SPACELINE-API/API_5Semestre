import { expect, test } from '@playwright/test';

const externalSession = encodeURIComponent(
	JSON.stringify({
		access_token: 'external-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'external-user', email: 'externo@example.com' },
	}),
);

async function useProfile(
	page: import('@playwright/test').Page,
	permissions: string[],
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
				roles: [{ id: 'external', name: 'Perfil de teste' }],
				permissions,
			}),
		}),
	);
}

test.describe('configuração de sessão', () => {
	test('exibe o tempo atual e salva um novo tempo', async ({ page }) => {
		let requestBody: Record<string, unknown> = {};
		await useProfile(page, ['roles.read', 'settings.write']);
		await page.route('**/api/support/inactivity-timeout', async (route) => {
			if (route.request().method() === 'PATCH') {
				requestBody = route.request().postDataJSON() as Record<string, unknown>;
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ minutes: 60 }),
				});
				return;
			}
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ minutes: 35 }),
			});
		});

		await page.goto('/configuracoes/sessao');
		await expect(page.getByText('35 minutos')).toBeVisible();

		const input = page.getByPlaceholder('Ex: 30');
		await expect(input).toHaveValue('35');
		await input.fill('60');
		await page.getByRole('button', { name: 'Salvar' }).click();

		await expect(
			page.getByText('Tempo de sessão atualizado com sucesso!'),
		).toBeVisible();
		expect(requestBody).toEqual({ minutes: 60 });
		await expect(page.getByText('60 minutos')).toBeVisible();
	});

	test('valida o intervalo permitido antes de salvar', async ({ page }) => {
		let patchCalled = false;
		await useProfile(page, ['roles.read', 'settings.write']);
		await page.route('**/api/support/inactivity-timeout', async (route) => {
			if (route.request().method() === 'PATCH') patchCalled = true;
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ minutes: 35 }),
			});
		});

		await page.goto('/configuracoes/sessao');
		await page.getByPlaceholder('Ex: 30').fill('2000');
		await page.getByRole('button', { name: 'Salvar' }).click();

		await expect(
			page.getByText('Informe um valor entre 1 e 1440 minutos.'),
		).toBeVisible();
		expect(patchCalled).toBe(false);
	});

	test('bloqueia a edição sem permissão de escrita', async ({ page }) => {
		await useProfile(page, ['roles.read', 'settings.read']);
		await page.route('**/api/support/inactivity-timeout', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ minutes: 35 }),
			}),
		);

		await page.goto('/configuracoes/sessao');
		await expect(page.getByText('35 minutos')).toBeVisible();
		await expect(
			page.getByText(
				'Seu perfil não tem permissão para alterar o tempo de sessão.',
			),
		).toBeVisible();
		await expect(page.getByPlaceholder('Ex: 30')).not.toBeEditable();
	});
});

test.describe('logout por inatividade', () => {
	async function mockTimeout(
		page: import('@playwright/test').Page,
		minutes: number,
	) {
		await page.route('**/api/support/inactivity-timeout', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ minutes }),
			}),
		);
	}

	test('desloga o usuário após o tempo configurado sem atividade', async ({
		page,
	}) => {
		await page.clock.install();
		await useProfile(page, ['roles.read', 'settings.write']);
		await mockTimeout(page, 1);

		await page.goto('/configuracoes/sessao');
		await expect(page.getByText('1 minuto', { exact: true })).toBeVisible();

		await page.clock.fastForward('01:15');

		await expect(page).toHaveURL(/\/login$/);
	});

	test('mantém a sessão enquanto houver atividade', async ({ page }) => {
		await page.clock.install();
		await useProfile(page, ['roles.read', 'settings.write']);
		await mockTimeout(page, 1);

		await page.goto('/configuracoes/sessao');
		await expect(page.getByText('1 minuto', { exact: true })).toBeVisible();

		await page.clock.fastForward('00:45');
		await page.mouse.move(200, 200);
		await page.keyboard.press('Shift');
		await page.clock.fastForward('00:45');

		await expect(page).toHaveURL(/\/configuracoes\/sessao$/);
	});

	test('aplica o novo tempo salvo sem recarregar a página', async ({
		page,
	}) => {
		await page.clock.install();
		await useProfile(page, ['roles.read', 'settings.write']);
		await page.route('**/api/support/inactivity-timeout', async (route) => {
			const isPatch = route.request().method() === 'PATCH';
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ minutes: isPatch ? 1 : 30 }),
			});
		});

		await page.goto('/configuracoes/sessao');
		await expect(page.getByText('30 minutos')).toBeVisible();

		await page.getByPlaceholder('Ex: 30').fill('1');
		await page.getByRole('button', { name: 'Salvar' }).click();
		await expect(
			page.getByText('Tempo de sessão atualizado com sucesso!'),
		).toBeVisible();

		await page.clock.fastForward('01:15');

		await expect(page).toHaveURL(/\/login$/);
	});
});
