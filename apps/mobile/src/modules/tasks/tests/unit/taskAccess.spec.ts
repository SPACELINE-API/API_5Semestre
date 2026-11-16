import { expect, test } from '@playwright/test';
import type { AuthorizationContext } from '../../../auth/services/auth';
import { canAccess } from '../../../auth/services/authorization';

function context(
	roles: string[],
	permissions: string[] = [],
): AuthorizationContext {
	return {
		user: { id: 'u', email: 'pessoa@example.com' },
		roles: roles.map((name, index) => ({ id: String(index), name })),
		permissions,
	};
}

test.describe('acesso às telas de tarefas', () => {
	test('qualquer funcionário interno acessa as próprias tarefas', () => {
		expect(canAccess(context(['Atendimento']), '/tarefas')).toBe(true);
		expect(
			canAccess(context(['Financeiro'], ['finance.read']), '/tarefas'),
		).toBe(true);
		expect(canAccess(context(['Administrador']), '/tarefas')).toBe(true);
	});

	test('tradutor e usuário sem sessão não acessam tarefas internas', () => {
		expect(canAccess(context(['Recursos externos']), '/tarefas')).toBe(false);
		expect(canAccess(context(['Tradutor']), '/tarefas')).toBe(false);
		expect(canAccess(null, '/tarefas')).toBe(false);
	});
});
