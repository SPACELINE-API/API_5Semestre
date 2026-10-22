import type { Page } from '@playwright/test';

const SESSION_COOKIE = 'spaceline_session';

export async function loginAsTranslator(page: Page) {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: { id: 'test-user-id', email: 'maria.tradutora@example.com' },
				roles: [{ id: 'test-external', name: 'Recursos externos' }],
				permissions: ['assignments.read', 'dashboard.read'],
			}),
		}),
	);

	const session = {
		access_token: 'test-access-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: {
			id: 'test-user-id',
			email: 'maria.tradutora@example.com',
			role: 'tradutor',
		},
	};

	await page.goto('/login');
	await page.evaluate(
		(value) => {
			document.cookie = `${value.name}=${value.encoded}; path=/; SameSite=Lax`;
		},
		{
			name: SESSION_COOKIE,
			encoded: encodeURIComponent(JSON.stringify(session)),
		},
	);
}
