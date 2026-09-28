import type { Page } from '@playwright/test';

const SESSION_COOKIE = 'spaceline_session';

export async function loginAs(page: Page) {
	const session = {
		access_token: 'test-access-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'test-user-id', email: 'maria.tradutora@example.com' },
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
