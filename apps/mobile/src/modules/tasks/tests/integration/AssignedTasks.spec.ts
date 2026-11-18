import { expect, test, type Page } from '@playwright/test';
import {
	colleagueTask,
	loginAsAdmin,
	loginAsEmployee,
	loginAsManager,
	MANAGER,
	mockTasksApi,
	task,
} from './taskTestHelpers';

const IN_REVIEW = task({
	id: 'task-review',
	description: 'Organizar contratos de outubro',
	status: 'in_review',
	execution_description: 'Contratos separados por cliente.',
	attachments: [
		{
			id: 'att-1',
			filename: 'contratos.pdf',
			content_type: 'application/pdf',
			size_bytes: 524_288,
			uploaded_by_id: 'employee-id',
			created_at: '2026-11-11T10:00:00Z',
		},
	],
});
const COLLEAGUE_PENDING = colleagueTask({
	id: 'task-colleague',
	description: 'Conferir notas fiscais',
	status: 'pending',
});
// ATRIBUIDA POR OUTRA PESSOA: SO APARECE EM "TODA A EQUIPE"
const FROM_MANAGER = colleagueTask({
	id: 'task-manager',
	description: 'Revisar planilha de custos',
	status: 'in_progress',
	requester_id: MANAGER.id,
	requester: MANAGER,
});

async function openAssigned(page: Page) {
	await loginAsAdmin(page);
	await page.goto('/tarefas/atribuidas');
	await expect(
		page.getByRole('tab', { name: 'Atribuídas por mim' }),
	).toBeVisible();
}

function openTask(page: Page, description: string) {
	return page.getByLabel(`Abrir tarefa ${description}`).click();
}

test('a sidebar tem uma única opção Tarefas, organizada em abas', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW]);
	await loginAsAdmin(page);
	await page.goto('/dashboard');

	await expect(page.getByLabel('Tarefas da equipe')).toHaveCount(0);
	await page.getByLabel('Tarefas', { exact: true }).click();

	await expect(page).toHaveURL(/\/tarefas\/atribuidas$/);
	await page.getByRole('tab', { name: 'Atribuídas a mim' }).click();
	await expect(page).toHaveURL(/\/tarefas\/minhas$/);
});

test('lista as tarefas atribuídas pelo usuário com o responsável', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW, COLLEAGUE_PENDING, FROM_MANAGER]);
	await openAssigned(page);

	await expect(page.getByText('Responsável: Carla Atendimento')).toBeVisible();
	await expect(page.getByText('Responsável: Diego Projetos')).toBeVisible();
	await expect(page.getByText('Revisar planilha de custos')).toHaveCount(0);
	await expect(
		page.getByText('1 aguardando avaliação', { exact: false }),
	).toBeVisible();
});

test('quem avalia também consulta as tarefas de toda a equipe', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW, FROM_MANAGER]);
	await openAssigned(page);

	await page.getByLabel('Mostrar toda a equipe').click();

	await expect(page.getByText('Revisar planilha de custos')).toBeVisible();
	await expect(page.getByText('Organizar contratos de outubro')).toBeVisible();
});

test('cria uma tarefa para um funcionário interno', async ({ page }) => {
	const api = await mockTasksApi(page, [IN_REVIEW]);
	await openAssigned(page);

	await page.getByLabel('Nova tarefa').click();
	const create = page.getByRole('button', {
		name: 'Criar tarefa',
		exact: true,
	});
	// SEM RESPONSAVEL E DESCRICAO, A CRIACAO FICA BLOQUEADA
	await expect(create).toBeDisabled();

	await page.getByText('Selecione o funcionário').click();
	await page.getByText('Diego Projetos (diego@spaceline.com.br)').click();
	await expect(create).toBeDisabled();
	await page
		.getByLabel('Descrição da tarefa')
		.fill('Atualizar a planilha de fornecedores');
	await create.click();

	await expect(
		page.getByText('Tarefa atribuída a Diego Projetos.'),
	).toBeVisible();
	await expect(
		page.getByText('Atualizar a planilha de fornecedores'),
	).toBeVisible();
	expect(api.calls).toContain('POST create');
	const created = api.tasks()[0];
	expect(created.assignee_id).toBe('colleague-id');
	expect(created.status).toBe('pending');
	expect(created.due_date).toBeNull();
});

test('busca por funcionário e filtra por status', async ({ page }) => {
	await mockTasksApi(page, [IN_REVIEW, COLLEAGUE_PENDING]);
	await openAssigned(page);

	await page.getByLabel('Buscar tarefas').fill('diego');
	await expect(page.getByText('Conferir notas fiscais')).toBeVisible();
	await expect(page.getByText('Organizar contratos de outubro')).toHaveCount(0);

	await page.getByLabel('Buscar tarefas').fill('');
	await page.getByLabel('Filtrar Em análise').click();
	await expect(page.getByText('Organizar contratos de outubro')).toBeVisible();
	await expect(page.getByText('Conferir notas fiscais')).toHaveCount(0);
});

test('visualiza a descrição da execução e os anexos', async ({ page }) => {
	await mockTasksApi(page, [IN_REVIEW]);
	await openAssigned(page);
	await openTask(page, 'Organizar contratos de outubro');

	await expect(page.getByText('Avaliação da tarefa')).toBeVisible();
	await expect(
		page.getByText('Contratos separados por cliente.'),
	).toBeVisible();
	await expect(page.getByText('contratos.pdf')).toBeVisible();
	await expect(page.getByLabel('Visualizar contratos.pdf')).toBeVisible();
	// QUEM AVALIA NAO ALTERA OS ANEXOS
	await expect(page.getByLabel('Remover contratos.pdf')).toHaveCount(0);
});

test('aprova uma tarefa em análise com confirmação', async ({ page }) => {
	const api = await mockTasksApi(page, [IN_REVIEW]);
	await openAssigned(page);
	await openTask(page, 'Organizar contratos de outubro');

	await page.getByLabel('Aprovar tarefa').click();
	await expect(page.getByText('Aprovar tarefa?')).toBeVisible();
	await page.getByRole('button', { name: 'Aprovar', exact: true }).click();

	await expect(page.getByText('Tarefa aprovada.')).toBeVisible();
	await expect(
		page.getByText('Concluído', { exact: true }).first(),
	).toBeVisible();
	expect(api.calls).toContain('POST approve');
});

test('a reprovação exige justificativa', async ({ page }) => {
	const api = await mockTasksApi(page, [IN_REVIEW]);
	await openAssigned(page);
	await openTask(page, 'Organizar contratos de outubro');

	await page.getByLabel('Reprovar tarefa').click();
	await expect(page.getByText('A justificativa é obrigatória.')).toBeVisible();
	const confirm = page.getByRole('button', { name: 'Reprovar', exact: true });
	await expect(confirm).toBeDisabled();
	expect(api.calls).not.toContain('POST reject');

	await page
		.getByLabel('Justificativa da reprovação')
		.fill('Faltaram os contratos da Acme.');
	await confirm.click();

	await expect(page.getByText('Tarefa reprovada.')).toBeVisible();
	await expect(
		page.getByText('Reprovado', { exact: true }).first(),
	).toBeVisible();
	expect(api.tasks()[0].rejection_reason).toBe(
		'Faltaram os contratos da Acme.',
	);
});

test('tarefa fora de análise não pode ser aprovada nem reprovada', async ({
	page,
}) => {
	await mockTasksApi(page, [COLLEAGUE_PENDING]);
	await openAssigned(page);
	await openTask(page, 'Conferir notas fiscais');

	await expect(
		page.getByText(
			'Somente tarefas em análise podem ser aprovadas ou reprovadas.',
		),
	).toBeVisible();
	await expect(page.getByLabel('Aprovar tarefa')).toHaveCount(0);
	await expect(page.getByLabel('Reprovar tarefa')).toHaveCount(0);
});

test('quem atribui sem tasks.review acompanha, mas não avalia', async ({
	page,
}) => {
	const fromManager = {
		...IN_REVIEW,
		requester_id: MANAGER.id,
		requester: MANAGER,
	};
	await mockTasksApi(page, [fromManager], { requester: MANAGER });
	await loginAsManager(page);
	await page.goto('/tarefas/atribuidas');

	await expect(page.getByLabel('Mostrar toda a equipe')).toHaveCount(0);
	await openTask(page, 'Organizar contratos de outubro');

	await expect(
		page.getByText('Contratos separados por cliente.'),
	).toBeVisible();
	await expect(page.getByLabel('Aprovar tarefa')).toHaveCount(0);
	await expect(page.getByLabel('Reprovar tarefa')).toHaveCount(0);
	await expect(
		page.getByText('A aprovação ou reprovação é feita por quem tem permissão', {
			exact: false,
		}),
	).toBeVisible();
});

test('funcionário sem permissão para atribuir não acessa a aba', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW]);
	await loginAsEmployee(page);
	await page.goto('/tarefas/atribuidas');

	await expect(page).not.toHaveURL(/\/tarefas\/atribuidas/);
	await expect(page.getByLabel('Nova tarefa')).toHaveCount(0);
});
