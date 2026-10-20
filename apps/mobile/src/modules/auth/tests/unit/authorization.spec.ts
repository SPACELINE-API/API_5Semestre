import { test, expect } from '@playwright/test';
import type { AuthorizationContext } from '../../services/auth';
import {
	LANDING_ROUTES,
	ROUTE_PERMISSIONS,
	canAccess,
	firstAllowedRoute,
} from '../../services/authorization';

function context(permissions: string[]): AuthorizationContext {
	return { user: { id: 'u', email: 'a@b.com' }, roles: [], permissions };
}

test.describe('firstAllowedRoute', () => {
	test('returns the first route the user can open', () => {
		expect(firstAllowedRoute(context(['dashboard.read', 'users.read']))).toBe(
			'/dashboard',
		);
		expect(firstAllowedRoute(context(['clients.read']))).toBe('/clientes');
	});

	test('skips permitted routes that have no screen yet', () => {
		expect(firstAllowedRoute(context(['roles.read', 'users.read']))).toBe(
			'/login',
		);
		expect(firstAllowedRoute(context(['users.read', 'clients.read']))).toBe(
			'/clientes',
		);
	});

	test('falls back to login without permissions or context', () => {
		expect(firstAllowedRoute(context([]))).toBe('/login');
		expect(firstAllowedRoute(null)).toBe('/login');
	});

	test('only lands on routes that are guarded by a permission', () => {
		for (const route of LANDING_ROUTES) {
			expect(ROUTE_PERMISSIONS[route]).toBeTruthy();
		}
	});
});

test.describe('canAccess', () => {
	test('requires the permission of the matching route and its children', () => {
		const user = context(['reports.productivity.read']);

		expect(canAccess(user, '/produtividade')).toBe(true);
		expect(canAccess(user, '/produtividade/abc')).toBe(true);
		expect(canAccess(user, '/tradutores')).toBe(false);
	});

	test('keeps login and public request pages open', () => {
		expect(canAccess(null, '/login')).toBe(true);
		expect(canAccess(null, '/solicitar-servico')).toBe(true);
	});

	test('blocks unknown paths', () => {
		expect(canAccess(context(['dashboard.read']), '/')).toBe(false);
	});
});
