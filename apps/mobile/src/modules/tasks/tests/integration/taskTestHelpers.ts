import type { Page, Route } from '@playwright/test';
import type { Task, TaskStatus } from '../../types/task';

const SESSION_COOKIE = 'spaceline_session';

export const EMPLOYEE = {
	id: 'employee-id',
	name: 'Carla Atendimento',
	email: 'cliente@spaceline.com.br',
};
export const ADMIN = {
	id: 'admin-id',
	name: 'Admin',
	email: 'admin@spaceline.com.br',
};
export const MANAGER = {
	id: 'manager-id',
	name: 'Paula Projetos',
	email: 'projetos@spaceline.com.br',
};
export const COLLEAGUE = {
	id: 'colleague-id',
	name: 'Diego Projetos',
	email: 'diego@spaceline.com.br',
};

export const SIGNED_URL =
	'http://localhost:8000/storage/v1/object/sign/task-attachments/t1/relatorio.pdf?token=abc';

type Session = {
	user: { id: string; email: string; role: string };
	roles: { id: string; name: string }[];
	permissions: string[];
};

async function loginAs(page: Page, session: Session) {
	await page.route('**/api/auth/me', (route) =>
		route.fulfill(
			json({
				user: { id: session.user.id, email: session.user.email },
				roles: session.roles,
				permissions: session.permissions,
			}),
		),
	);

	const cookie = {
		access_token: `${session.user.id}-token`,
		token_type: 'bearer',
		expires_in: 3600,
		user: session.user,
	};

	await page.goto('/login');
	await page.evaluate(
		(value) => {
			document.cookie = `${value.name}=${value.encoded}; path=/; SameSite=Lax`;
		},
		{
			name: SESSION_COOKIE,
			encoded: encodeURIComponent(JSON.stringify(cookie)),
		},
	);
}

export function loginAsEmployee(page: Page) {
	return loginAs(page, {
		user: { id: EMPLOYEE.id, email: EMPLOYEE.email, role: 'cliente' },
		roles: [{ id: 'atendimento', name: 'Atendimento' }],
		permissions: ['clients.read', 'requests.read', 'dashboard.read'],
	});
}

export function loginAsAdmin(page: Page) {
	return loginAs(page, {
		user: { id: ADMIN.id, email: ADMIN.email, role: 'admin' },
		roles: [{ id: 'admin-role', name: 'Administrador' }],
		permissions: ['assignments.write', 'tasks.review', 'dashboard.read'],
	});
}

// CRIA E ACOMPANHA TAREFAS, MAS NAO AVALIA (SEM tasks.review)
export function loginAsManager(page: Page) {
	return loginAs(page, {
		user: { id: MANAGER.id, email: MANAGER.email, role: 'interno' },
		roles: [{ id: 'projetos', name: 'Projetos' }],
		permissions: ['assignments.write', 'dashboard.read'],
	});
}

export function loginAsTranslator(page: Page) {
	return loginAs(page, {
		user: {
			id: 'translator-id',
			email: 'recurso.externo@spaceline.com.br',
			role: 'tradutor',
		},
		roles: [{ id: 'external', name: 'Recursos externos' }],
		permissions: ['assignments.read', 'dashboard.read'],
	});
}

export function json(body: unknown, status = 200) {
	return {
		status,
		contentType: 'application/json',
		body: JSON.stringify(body),
	};
}

export function task(
	overrides: Pick<Task, 'id' | 'description' | 'status'> & Partial<Task>,
): Task {
	return {
		due_date: '2026-11-30',
		requester_id: ADMIN.id,
		assignee_id: EMPLOYEE.id,
		requester: ADMIN,
		assignee: EMPLOYEE,
		execution_description: null,
		rejection_reason: null,
		reviewed_at: null,
		attachments: [],
		created_at: '2026-11-10T13:00:00Z',
		updated_at: '2026-11-10T13:00:00Z',
		...overrides,
	};
}

export function colleagueTask(
	overrides: Pick<Task, 'id' | 'description' | 'status'> & Partial<Task>,
): Task {
	return task({ assignee_id: COLLEAGUE.id, assignee: COLLEAGUE, ...overrides });
}

// TRANSICOES ACEITAS PELA API SIMULADA (AS MESMAS DO BACKEND)
const TRANSITIONS: Record<string, { from: TaskStatus; to: TaskStatus }> = {
	start: { from: 'pending', to: 'in_progress' },
	submit: { from: 'in_progress', to: 'in_review' },
	resume: { from: 'rejected', to: 'in_progress' },
	approve: { from: 'in_review', to: 'completed' },
	reject: { from: 'in_review', to: 'rejected' },
};

export type MockedTasksApi = {
	calls: string[];
	tasks: () => Task[];
};

// NENHUMA CHAMADA CHEGA AO BACKEND REAL: O QUE NAO FOR SIMULADO E ABORTADO
export async function mockTasksApi(
	page: Page,
	initial: Task[],
	options: { failList?: boolean; requester?: typeof ADMIN } = {},
): Promise<MockedTasksApi> {
	let tasks = initial.map((item) => ({ ...item }));
	const calls: string[] = [];
	let failList = options.failList ?? false;

	await page.context().route(/localhost:(3333|8000)/, (route) => route.abort());

	const list = (route: Route, items: Task[]) => {
		if (failList) {
			failList = false;
			return route.fulfill(json({ detail: 'Erro interno' }, 500));
		}
		return route.fulfill(json(items));
	};

	await page.route('**/api/tasks/me', (route) =>
		list(
			route,
			tasks.filter((item) => item.assignee_id === EMPLOYEE.id),
		),
	);
	const requester = options.requester ?? ADMIN;
	await page.route('**/api/tasks/assignees', (route) =>
		route.fulfill(json([ADMIN, EMPLOYEE, COLLEAGUE])),
	);
	await page.route('**/api/tasks/assigned-by-me', (route) =>
		list(
			route,
			tasks.filter((item) => item.requester_id === requester.id),
		),
	);
	await page.route(/\/api\/tasks(\?.*)?$/, (route) => {
		if (route.request().method() !== 'POST') return list(route, tasks);
		// CRIACAO: A TAREFA NASCE PENDENTE PARA O FUNCIONARIO ESCOLHIDO
		const body = route.request().postDataJSON() as {
			description: string;
			due_date: string | null;
			assignee_id: string;
		};
		const assignee = [ADMIN, EMPLOYEE, COLLEAGUE].find(
			(person) => person.id === body.assignee_id,
		)!;
		calls.push('POST create');
		const created = task({
			id: `task-${tasks.length + 1}`,
			description: body.description,
			status: 'pending',
			due_date: body.due_date,
			assignee_id: assignee.id,
			assignee,
			requester_id: requester.id,
			requester,
		});
		tasks = [created, ...tasks];
		return route.fulfill(json(created, 201));
	});

	await page.route(/\/api\/tasks\/[^/]+\/[a-z/-]+/, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const [, , taskId, action, attachmentId, extra] = url.pathname
			.split('/')
			.filter(Boolean);
		const current = tasks.find((item) => item.id === taskId);
		if (!current)
			return route.fulfill(json({ detail: 'Tarefa não encontrada' }, 404));
		calls.push(
			`${request.method()} ${action}${attachmentId ? `/${extra ?? 'id'}` : ''}`,
		);

		const save = (updated: Task) => {
			tasks = tasks.map((item) => (item.id === taskId ? updated : item));
			return route.fulfill(json(updated));
		};

		if (action in TRANSITIONS) {
			const transition = TRANSITIONS[action];
			if (current.status !== transition.from) {
				return route.fulfill(json({ detail: 'Transição inválida' }, 409));
			}
			const body = request.postDataJSON() as { reason?: string } | null;
			return save({
				...current,
				status: transition.to,
				rejection_reason:
					action === 'reject'
						? (body?.reason ?? null)
						: current.rejection_reason,
				reviewed_at:
					action === 'approve' || action === 'reject'
						? '2026-11-12T15:00:00Z'
						: current.reviewed_at,
			});
		}

		if (action === 'execution') {
			const body = request.postDataJSON() as { execution_description: string };
			return save({
				...current,
				execution_description: body.execution_description,
			});
		}

		if (
			action === 'attachments' &&
			!attachmentId &&
			request.method() === 'POST'
		) {
			const disposition = request.postDataBuffer()?.toString('latin1') ?? '';
			const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'arquivo';
			return save({
				...current,
				attachments: [
					...current.attachments,
					{
						id: `att-${current.attachments.length + 1}`,
						filename,
						content_type: 'application/pdf',
						size_bytes: 2048,
						uploaded_by_id: EMPLOYEE.id,
						created_at: '2026-11-11T10:00:00Z',
					},
				],
			});
		}

		if (action === 'attachments' && attachmentId && extra === 'file') {
			return route.fulfill(json({ url: SIGNED_URL, expires_in: 300 }));
		}

		if (
			action === 'attachments' &&
			attachmentId &&
			request.method() === 'DELETE'
		) {
			tasks = tasks.map((item) =>
				item.id === taskId
					? {
							...item,
							attachments: item.attachments.filter(
								(attachment) => attachment.id !== attachmentId,
							),
						}
					: item,
			);
			return route.fulfill({ status: 204, body: '' });
		}

		return route.fulfill(json({ detail: 'Não simulado' }, 404));
	});

	return { calls, tasks: () => tasks };
}
