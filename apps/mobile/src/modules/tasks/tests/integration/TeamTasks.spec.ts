import { expect, test, type Page } from '@playwright/test';
import {
	colleagueTask,
	loginAsAdmin,
	loginAsEmployee,
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

async function openTeamTasks(page: Page) {
	await loginAsAdmin(page);
	await page.goto('/tarefas/equipe');
	await expect(page.getByText('Tarefas da equipe').first()).toBeVisible();
}

function openTask(page: Page, description: string) {
	return page.getByLabel(`Abrir tarefa ${description}`).click();
}

test('lista as tarefas de todos os funcionários com o responsável', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW, COLLEAGUE_PENDING]);
	await openTeamTasks(page);

	await expect(page.getByText('Responsável: Carla Atendimento')).toBeVisible();
	await expect(page.getByText('Responsável: Diego Projetos')).toBeVisible();
	await expect(
		page.getByText('1 aguardando avaliação.', { exact: false }),
	).toBeVisible();
});

test('busca por funcionário e filtra por status', async ({ page }) => {
	await mockTasksApi(page, [IN_REVIEW, COLLEAGUE_PENDING]);
	await openTeamTasks(page);

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
	await openTeamTasks(page);
	await openTask(page, 'Organizar contratos de outubro');

	await expect(page.getByText('Avaliação da tarefa')).toBeVisible();
	await expect(
		page.getByText('Contratos separados por cliente.'),
	).toBeVisible();
	await expect(page.getByText('contratos.pdf')).toBeVisible();
	await expect(page.getByLabel('Visualizar contratos.pdf')).toBeVisible();
	// O AVALIADOR NAO ALTERA OS ANEXOS
	await expect(page.getByLabel('Remover contratos.pdf')).toHaveCount(0);
});

test('aprova uma tarefa em análise com confirmação', async ({ page }) => {
	const api = await mockTasksApi(page, [IN_REVIEW]);
	await openTeamTasks(page);
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
	await openTeamTasks(page);
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
	await openTeamTasks(page);
	await openTask(page, 'Conferir notas fiscais');

	await expect(
		page.getByText(
			'Somente tarefas em análise podem ser aprovadas ou reprovadas.',
		),
	).toBeVisible();
	await expect(page.getByLabel('Aprovar tarefa')).toHaveCount(0);
	await expect(page.getByLabel('Reprovar tarefa')).toHaveCount(0);
});

test('funcionário sem tasks.review não acessa a área administrativa', async ({
	page,
}) => {
	await mockTasksApi(page, [IN_REVIEW]);
	await loginAsEmployee(page);
	await page.goto('/tarefas/equipe');

	await expect(page).not.toHaveURL(/\/tarefas\/equipe/);
	await expect(page.getByText('Avaliação da tarefa')).toHaveCount(0);
});
