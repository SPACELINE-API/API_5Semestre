import type { Page } from '@playwright/test';

const SESSION_COOKIE = 'spaceline_session';

export async function loginAs(page: Page) {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: { id: 'test-user-id', email: 'maria.tradutora@example.com' },
				roles: [{ id: 'test-admin', name: 'Administrador de teste' }],
				permissions: [
					'dashboard.read',
					'assignments.read',
					'requests.read',
					'quotes.read',
					'service_orders.read',
					'clients.read',
					'translators.read',
					'support.read',
					'roles.read',
					'users.read',
					'settings.read',
					'projects.read',
					'clients.write',
					'contacts.read',
					'contacts.write',
					'requests.write',
					'quotes.write',
					'quotes.approve',
					'service_orders.write',
					'translators.write',
					'assignments.write',
					'assignments.manage',
					'assignments.respond',
					'documents.read',
					'documents.write',
					'support.write',
					'roles.write',
					'users.write',
					'settings.write',
				],
			}),
		}),
	);

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
