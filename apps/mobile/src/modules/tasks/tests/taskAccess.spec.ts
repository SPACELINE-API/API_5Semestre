import { expect, test } from '@playwright/test';
import type { AuthorizationContext } from '../../auth/services/auth';
import { canAccess } from '../../auth/services/authorization';

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
	test('qualquer funcionário interno acessa as tarefas atribuídas a ele', () => {
		for (const path of ['/tarefas', '/tarefas/minhas']) {
			expect(canAccess(context(['Atendimento']), path)).toBe(true);
			expect(canAccess(context(['Financeiro'], ['finance.read']), path)).toBe(
				true,
			);
			expect(canAccess(context(['Administrador']), path)).toBe(true);
		}
	});

	test('recurso externo e usuário sem sessão não acessam tarefas internas', () => {
		for (const path of ['/tarefas', '/tarefas/minhas', '/tarefas/atribuidas']) {
			expect(canAccess(context(['Recursos externos']), path)).toBe(false);
			expect(canAccess(context(['Tradutor']), path)).toBe(false);
			expect(canAccess(null, path)).toBe(false);
		}
	});

	test('a aba de tarefas atribuídas exige permissão para atribuir', () => {
		expect(canAccess(context(['Atendimento']), '/tarefas/atribuidas')).toBe(
			false,
		);
		expect(
			canAccess(
				context(['Projetos'], ['assignments.write']),
				'/tarefas/atribuidas',
			),
		).toBe(true);
		expect(canAccess(context(['Administrador']), '/tarefas/atribuidas')).toBe(
			true,
		);
	});
});
