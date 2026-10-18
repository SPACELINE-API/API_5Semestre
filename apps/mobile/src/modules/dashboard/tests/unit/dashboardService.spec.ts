import { expect, test } from '@playwright/test';
import {
	AVAILABLE_SHORTCUTS,
	fetchDashboardMetrics,
	getAuthorizedShortcuts,
} from '../../services/dashboardService';
import type { AuthorizationContext } from '../../../auth/services/auth';

test.describe('Dashboard Service Unit Tests', () => {
	test.describe('getAuthorizedShortcuts', () => {
		test('retorna lista vazia quando o contexto é nulo', () => {
			const shortcuts = getAuthorizedShortcuts(null);
			expect(shortcuts).toEqual([]);
		});

		test('retorna todos os atalhos disponíveis para Administrador', () => {
			const adminContext: AuthorizationContext = {
				user: { id: 'admin-id', email: 'admin@spaceline.com' },
				roles: [{ id: 'role-admin', name: 'Administrador' }],
				permissions: ['dashboard.read'],
			};

			const shortcuts = getAuthorizedShortcuts(adminContext);
			expect(shortcuts).toHaveLength(AVAILABLE_SHORTCUTS.length);
		});

		test('filtra atalhos de acordo com as permissões do usuário', () => {
			const context: AuthorizationContext = {
				user: { id: 'user-id', email: 'user@spaceline.com' },
				roles: [{ id: 'role-custom', name: 'Custom' }],
				permissions: ['dashboard.read', 'requests.read', 'quotes.read'],
			};

			const shortcuts = getAuthorizedShortcuts(context);
			expect(shortcuts).toHaveLength(2);
			expect(shortcuts.map((s) => s.id)).toEqual(['requests', 'quotes']);
		});

		test('retorna apenas tarefas atribuídas para Recursos externos', () => {
			const context: AuthorizationContext = {
				user: { id: 'trans-id', email: 'tradutor@spaceline.com' },
				roles: [{ id: 'role-ext', name: 'Recursos externos' }],
				permissions: [
					'assignments.read',
					'assignments.respond',
					'dashboard.read',
				],
			};

			const shortcuts = getAuthorizedShortcuts(context);
			expect(shortcuts).toHaveLength(1);
			expect(shortcuts[0].id).toBe('assignments');
			expect(shortcuts[0].route).toBe('/convites');
		});
	});

	test.describe('fetchDashboardMetrics', () => {
		test('retorna métricas de convites e tarefas para perfil Recursos externos', async () => {
			const originalFetch = globalThis.fetch;

			globalThis.fetch = async (url) => {
				const urlStr = String(url);
				if (urlStr.includes('/api/service-orders/invites/me')) {
					return {
						ok: true,
						status: 200,
						json: async () => [
							{ id: 'inv-1', status: 'pendente' },
							{ id: 'inv-2', status: 'pendente' },
							{ id: 'inv-3', status: 'aceito' },
						],
					} as Response;
				}
				return { ok: true, status: 200, json: async () => [] } as Response;
			};

			try {
				const context: AuthorizationContext = {
					user: { id: 'trans-id', email: 'tradutor@spaceline.com' },
					roles: [{ id: 'role-ext', name: 'Recursos externos' }],
					permissions: [
						'assignments.read',
						'assignments.respond',
						'dashboard.read',
					],
				};

				const metrics = await fetchDashboardMetrics(context);
				const pendingMetric = metrics.find(
					(m) => m.id === 'my-invites-pending',
				);
				const acceptedMetric = metrics.find(
					(m) => m.id === 'my-tasks-accepted',
				);

				expect(pendingMetric).toBeDefined();
				expect(pendingMetric?.value).toBe(2);
				expect(pendingMetric?.badge).toBe('Ação necessária');
				expect(pendingMetric?.badgeType).toBe('warning');

				expect(acceptedMetric).toBeDefined();
				expect(acceptedMetric?.value).toBe(1);
				expect(acceptedMetric?.badge).toBe('Ativas');
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		test('desconsidera convites aceitos cujas tarefas já foram concluídas', async () => {
			const originalFetch = globalThis.fetch;

			globalThis.fetch = async (url) => {
				const urlStr = String(url);
				if (urlStr.includes('/api/service-orders/invites/me')) {
					return {
						ok: true,
						status: 200,
						json: async () => [
							{ id: 'inv-1', status: 'aceito', item_status: 'em_andamento' },
							{ id: 'inv-2', status: 'aceito', item_status: 'concluida' },
							{ id: 'inv-3', status: 'pendente' },
						],
					} as Response;
				}
				return { ok: true, status: 200, json: async () => [] } as Response;
			};

			try {
				const context: AuthorizationContext = {
					user: { id: 'trans-id', email: 'tradutor@spaceline.com' },
					roles: [{ id: 'role-ext', name: 'Recursos externos' }],
					permissions: ['assignments.read'],
				};

				const metrics = await fetchDashboardMetrics(context);
				const acceptedMetric = metrics.find(
					(m) => m.id === 'my-tasks-accepted',
				);

				expect(acceptedMetric).toBeDefined();
				expect(acceptedMetric?.value).toBe(1);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});

		test('lida com falhas em endpoints sem lançar erro', async () => {
			const originalFetch = globalThis.fetch;

			globalThis.fetch = async () => {
				throw new Error('Falha de rede simulada');
			};

			try {
				const context: AuthorizationContext = {
					user: { id: 'trans-id', email: 'tradutor@spaceline.com' },
					roles: [{ id: 'role-ext', name: 'Recursos externos' }],
					permissions: ['assignments.read', 'dashboard.read'],
				};

				const metrics = await fetchDashboardMetrics(context);
				expect(Array.isArray(metrics)).toBe(true);
				expect(metrics).toHaveLength(0);
			} finally {
				globalThis.fetch = originalFetch;
			}
		});
	});
});
