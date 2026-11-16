import {
	apiDeleteAuth,
	apiGetAuth,
	apiPatchAuth,
	apiPostAuth,
	apiUrl,
} from '../../../shared/services/apiClient';
import type { NativeFile } from '../../../shared/types/file';
import { toUploadable } from '../../../shared/utils/toUploadable';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
import type { Task, TaskFile } from '../types/task';

const TASKS_PATH = '/api/tasks';

function taskPath(taskId: string) {
	return `${TASKS_PATH}/${taskId}`;
}

// TAREFAS DESTINADAS AO FUNCIONARIO AUTENTICADO
export function listMyTasks(): Promise<Task[]> {
	return apiGetAuth<Task[]>(`${TASKS_PATH}/me`);
}

// TAREFAS DE TODOS OS FUNCIONARIOS (EXIGE tasks.review)
export function listTeamTasks(): Promise<Task[]> {
	return apiGetAuth<Task[]>(TASKS_PATH);
}

export function startTask(taskId: string): Promise<Task> {
	return apiPostAuth<Task, Record<string, never>>(
		`${taskPath(taskId)}/start`,
		{},
	);
}

export function updateTaskExecution(
	taskId: string,
	executionDescription: string,
): Promise<Task> {
	return apiPatchAuth<Task, { execution_description: string }>(
		`${taskPath(taskId)}/execution`,
		{ execution_description: executionDescription },
	);
}

export async function addTaskAttachment(
	taskId: string,
	file: NativeFile,
): Promise<Task> {
	return uploadFileMultipart<Task>(
		`${apiUrl}${taskPath(taskId)}/attachments`,
		await toUploadable(file),
		{},
		'POST',
	);
}

export async function removeTaskAttachment(
	taskId: string,
	attachmentId: string,
): Promise<void> {
	await apiDeleteAuth(`${taskPath(taskId)}/attachments/${attachmentId}`);
}

// O ANEXO FICA EM BUCKET PRIVADO: CADA VISUALIZACAO PEDE UM LINK TEMPORARIO
export function getTaskAttachmentFile(
	taskId: string,
	attachmentId: string,
): Promise<TaskFile> {
	return apiGetAuth<TaskFile>(
		`${taskPath(taskId)}/attachments/${attachmentId}/file`,
	);
}

export function submitTask(taskId: string): Promise<Task> {
	return apiPostAuth<Task, Record<string, never>>(
		`${taskPath(taskId)}/submit`,
		{},
	);
}

export function resumeTask(taskId: string): Promise<Task> {
	return apiPostAuth<Task, Record<string, never>>(
		`${taskPath(taskId)}/resume`,
		{},
	);
}

export function approveTask(taskId: string): Promise<Task> {
	return apiPostAuth<Task, Record<string, never>>(
		`${taskPath(taskId)}/approve`,
		{},
	);
}

export function rejectTask(taskId: string, reason: string): Promise<Task> {
	return apiPostAuth<Task, { reason: string }>(`${taskPath(taskId)}/reject`, {
		reason,
	});
}
