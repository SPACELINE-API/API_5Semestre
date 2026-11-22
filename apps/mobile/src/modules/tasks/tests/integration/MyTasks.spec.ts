import { expect, test, type Page } from '@playwright/test';
import {
	colleagueTask,
	loginAsEmployee,
	loginAsTranslator,
	mockTasksApi,
	task,
} from './taskTestHelpers';

const PENDING = task({
	id: 'task-pending',
	description: 'Organizar contratos de outubro',
	status: 'pending',
});
const IN_PROGRESS = task({
	id: 'task-progress',
	description: 'Revisar planilha de faturas',
	status: 'in_progress',
	due_date: null,
});
const IN_REVIEW = task({
	id: 'task-review',
	description: 'Atualizar cadastro de clientes',
	status: 'in_review',
	execution_description: 'Cadastro atualizado.',
});
const REJECTED = task({
	id: 'task-rejected',
	description: 'Digitalizar documentos',
	status: 'rejected',
	execution_description: 'Documentos digitalizados.',
	rejection_reason: 'Faltaram os contratos da Acme.',
});
const COMPLETED = task({
	id: 'task-completed',
	description: 'Enviar relatório mensal',
	status: 'completed',
	execution_description: 'Relatório enviado.',
	attachments: [
		{
			id: 'att-1',
			filename: 'relatorio.pdf',
			content_type: 'application/pdf',
			size_bytes: 1_048_576,
			uploaded_by_id: 'employee-id',
			created_at: '2026-11-10T13:00:00Z',
		},
	],
});
const FROM_COLLEAGUE = colleagueTask({
	id: 'task-colleague',
	description: 'Tarefa de outro funcionário',
	status: 'pending',
});

async function openMyTasks(page: Page) {
	await loginAsEmployee(page);
	await page.goto('/tarefas/minhas');
	await expect(
		page.getByRole('tab', { name: 'Atribuídas a mim' }),
	).toBeVisible();
}

function openTask(page: Page, description: string) {
	return page.getByLabel(`Abrir tarefa ${description}`).click();
}

test('o menu do funcionário interno exibe a opção Tarefas', async ({
	page,
}) => {
	await mockTasksApi(page, []);
	await loginAsEmployee(page);
	await page.goto('/dashboard');

	await page.getByLabel('Tarefas', { exact: true }).click();

	// SEM PERMISSAO PARA ATRIBUIR, A OPCAO TAREFAS ABRE DIRETO NAS TAREFAS ATRIBUIDAS A ELE
	await expect(page).toHaveURL(/\/tarefas\/minhas$/);
	await expect(
		page.getByRole('tab', { name: 'Atribuídas a mim' }),
	).toBeVisible();
	await expect(
		page.getByRole('tab', { name: 'Atribuídas por mim' }),
	).toHaveCount(0);
});

test('lista somente as tarefas do funcionário com descrição, prazo e status', async ({
	page,
}) => {
	await mockTasksApi(page, [PENDING, IN_PROGRESS, COMPLETED, FROM_COLLEAGUE]);
	await openMyTasks(page);

	await expect(page.getByText('Organizar contratos de outubro')).toBeVisible();
	await expect(page.getByText('Prazo: 30/11/2026').first()).toBeVisible();
	await expect(page.getByText('Prazo: Sem prazo')).toBeVisible();
	await expect(
		page.getByText('Pendente', { exact: true }).first(),
	).toBeVisible();
	await expect(
		page.getByText('Em andamento', { exact: true }).first(),
	).toBeVisible();
	await expect(
		page.getByText('Concluído', { exact: true }).first(),
	).toBeVisible();
	await expect(page.getByText('Tarefa de outro funcionário')).toHaveCount(0);
	await expect(page.getByText('3 tarefas atribuídas a você')).toBeVisible();
});

test('filtra as tarefas pelos cinco status', async ({ page }) => {
	await mockTasksApi(page, [
		PENDING,
		IN_PROGRESS,
		IN_REVIEW,
		REJECTED,
		COMPLETED,
	]);
	await openMyTasks(page);

	for (const label of [
		'Pendente (1)',
		'Em andamento (1)',
		'Em análise (1)',
		'Reprovado (1)',
		'Concluído (1)',
	]) {
		await expect(page.getByText(label, { exact: true })).toBeVisible();
	}

	await page.getByLabel('Filtrar Reprovado').click();

	await expect(page.getByText('Digitalizar documentos')).toBeVisible();
	await expect(page.getByText('Organizar contratos de outubro')).toHaveCount(0);
});

test('informa quando não há tarefas', async ({ page }) => {
	await mockTasksApi(page, [FROM_COLLEAGUE]);
	await openMyTasks(page);

	await expect(page.getByText('Nenhuma tarefa atribuída a você')).toBeVisible();
});

test('exibe erro no carregamento e permite tentar novamente', async ({
	page,
}) => {
	await mockTasksApi(page, [PENDING], { failList: true });
	await openMyTasks(page);

	await expect(
		page.getByText('Não foi possível carregar as tarefas. Tente novamente.'),
	).toBeVisible();
	await page.getByText('Tentar novamente').click();

	await expect(page.getByText('Organizar contratos de outubro')).toBeVisible();
});

test('abre os detalhes e inicia uma tarefa pendente', async ({ page }) => {
	await mockTasksApi(page, [PENDING]);
	await openMyTasks(page);
	await openTask(page, 'Organizar contratos de outubro');

	await expect(page.getByText('Detalhes da tarefa')).toBeVisible();
	await expect(page.getByText('Criada em')).toBeVisible();
	// PENDENTE NAO ACEITA EXECUCAO NEM ENVIO
	await expect(page.getByLabel('Enviar para análise')).toHaveCount(0);
	await expect(page.getByLabel('Anexar arquivo')).toHaveCount(0);

	await page.getByLabel('Iniciar tarefa').click();

	await expect(page.getByText('Tarefa iniciada.')).toBeVisible();
	await expect(page.getByLabel('Iniciar tarefa')).toHaveCount(0);
	await expect(page.getByLabel('Descrição da execução')).toBeVisible();
});

test('registra a execução, anexa arquivos e envia para análise', async ({
	page,
}) => {
	const api = await mockTasksApi(page, [IN_PROGRESS]);
	await openMyTasks(page);
	await openTask(page, 'Revisar planilha de faturas');

	// SEM A DESCRICAO SALVA, O ENVIO FICA BLOQUEADO
	await expect(page.getByLabel('Enviar para análise')).toBeDisabled();

	await page
		.getByLabel('Descrição da execução')
		.fill('Planilha revisada e valores conferidos.');
	await page.getByLabel('Salvar descrição').click();
	await expect(page.getByText('Descrição da execução salva.')).toBeVisible();

	for (const name of ['planilha.pdf', 'comprovante.pdf']) {
		const chooser = page.waitForEvent('filechooser');
		await page.getByLabel('Anexar arquivo').click();
		await (
			await chooser
		).setFiles({
			name,
			mimeType: 'application/pdf',
			buffer: Buffer.from('%PDF-1.4 conteudo %%EOF'),
		});
		await expect(page.getByText(name)).toBeVisible();
	}

	await page.getByLabel('Enviar para análise').click();

	await expect(page.getByText('Tarefa enviada para análise.')).toBeVisible();
	await expect(
		page.getByText('Em análise', { exact: true }).first(),
	).toBeVisible();
	await expect(page.getByLabel('Descrição da execução')).toHaveCount(0);
	expect(api.tasks()[0].attachments).toHaveLength(2);
	expect(api.calls).toContain('POST submit');
});

test('remove um anexo com confirmação enquanto a tarefa está em andamento', async ({
	page,
}) => {
	await mockTasksApi(page, [
		{ ...IN_PROGRESS, attachments: COMPLETED.attachments },
	]);
	await openMyTasks(page);
	await openTask(page, 'Revisar planilha de faturas');

	await page.getByLabel('Remover relatorio.pdf').click();
	await page.getByLabel('Confirmar remoção de relatorio.pdf').click();

	await expect(page.getByText('Nenhum arquivo anexado.')).toBeVisible();
});

test('visualiza o anexo por link temporário', async ({ page }) => {
	const api = await mockTasksApi(page, [COMPLETED]);
	await openMyTasks(page);
	await openTask(page, 'Enviar relatório mensal');

	const popup = page.waitForEvent('popup');
	await page.getByLabel('Visualizar relatorio.pdf').click();

	// O ARQUIVO E ABERTO EM OUTRA ABA COM O LINK ASSINADO PEDIDO A API
	await popup;
	expect(api.calls).toContain('GET attachments/file');
	// TAREFA CONCLUIDA: SO VISUALIZACAO, SEM REMOVER OU ANEXAR
	await expect(page.getByLabel('Remover relatorio.pdf')).toHaveCount(0);
	await expect(page.getByLabel('Anexar arquivo')).toHaveCount(0);
});

test('exibe o motivo da reprovação e permite retomar a tarefa', async ({
	page,
}) => {
	await mockTasksApi(page, [REJECTED]);
	await openMyTasks(page);
	await openTask(page, 'Digitalizar documentos');

	await expect(
		page.getByText('Faltaram os contratos da Acme.', { exact: false }),
	).toBeVisible();
	await expect(page.getByText('Motivo da reprovação:')).toBeVisible();

	await page.getByLabel('Retomar tarefa').click();

	await expect(page.getByText('Tarefa retomada.')).toBeVisible();
	await expect(page.getByText('Motivo da última reprovação:')).toBeVisible();
	await expect(page.getByLabel('Descrição da execução')).toHaveValue(
		'Documentos digitalizados.',
	);
});

test('tarefa em análise não oferece ações ao funcionário', async ({ page }) => {
	await mockTasksApi(page, [IN_REVIEW]);
	await openMyTasks(page);
	await openTask(page, 'Atualizar cadastro de clientes');

	await expect(page.getByText('Cadastro atualizado.')).toBeVisible();
	for (const action of [
		'Iniciar tarefa',
		'Enviar para análise',
		'Retomar tarefa',
		'Anexar arquivo',
	]) {
		await expect(page.getByLabel(action)).toHaveCount(0);
	}
});

test('exibe o erro da API quando a ação é recusada', async ({ page }) => {
	const api = await mockTasksApi(page, [PENDING]);
	await openMyTasks(page);
	await openTask(page, 'Organizar contratos de outubro');
	// OUTRA SESSAO JA INICIOU A TAREFA: A API RESPONDE 409
	api.tasks()[0].status = 'in_progress';

	await page.getByLabel('Iniciar tarefa').click();

	await expect(page.getByText('Transição inválida')).toBeVisible();
});

test('recurso externo não acessa as tarefas internas', async ({ page }) => {
	await mockTasksApi(page, []);
	await loginAsTranslator(page);
	await page.goto('/tarefas');

	await expect(page).not.toHaveURL(/\/tarefas/);
	await expect(page.getByRole('tab', { name: 'Atribuídas a mim' })).toHaveCount(
		0,
	);
});
