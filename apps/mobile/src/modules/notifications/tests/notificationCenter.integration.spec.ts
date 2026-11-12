import { expect, test } from '@playwright/test';

const sessionCookie = encodeURIComponent(
	JSON.stringify({
		access_token: 'notification-test-token',
		token_type: 'bearer',
		expires_in: 3600,
		user: { id: 'notification-user-id', email: 'admin@example.com' },
	}),
);

const notifications = Array.from({ length: 10 }, (_, index) => ({
	id: `notification-${index + 1}`,
	event_type: 'notification_test',
	title: `Notificação de teste ${index + 1}`,
	message: 'Mensagem criada para validar a rolagem do popup.',
	related_type: null,
	related_id: null,
	created_at: new Date(Date.now() - index * 86_400_000).toISOString(),
	read_at: null,
}));

test('exibe todas as notificações em uma lista interna rolável no mobile', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
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
				user: { id: 'notification-user-id', email: 'admin@example.com' },
				roles: [{ id: 'role-1', name: 'Administrador' }],
				permissions: ['dashboard.read'],
			}),
		}),
	);
	await page.route(/\/api\/notifications\?/, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				items: notifications,
				total: notifications.length,
				page: 1,
				page_size: 100,
			}),
		}),
	);
	await page.route(/\/api\/notifications\/unread-count/, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ count: notifications.length }),
		}),
	);
	await page.route(
		/\/api\/(quotes|service-orders|requests|clients|translators)/,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([]),
			}),
	);

	await page.goto('/dashboard');
	await page.getByRole('button', { name: /Notificações/ }).click();

	await expect(page.getByText('Notificação de teste 10')).toBeAttached();

	const scrollMetrics = await page
		.getByText('Notificação de teste 10')
		.evaluate((element) => {
			let node: HTMLElement | null = element.parentElement;
			while (node) {
				const style = window.getComputedStyle(node);
				if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
					const scrollContainer = node;
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
					return {
						clientHeight: scrollContainer.clientHeight,
						scrollHeight: scrollContainer.scrollHeight,
						scrollTop: scrollContainer.scrollTop,
					};
				}
				node = node.parentElement;
			}
			return null;
		});

	expect(scrollMetrics).not.toBeNull();
	expect(scrollMetrics?.scrollHeight).toBeGreaterThan(
		scrollMetrics?.clientHeight ?? 0,
	);
	expect(scrollMetrics?.scrollTop).toBeGreaterThan(0);
});
