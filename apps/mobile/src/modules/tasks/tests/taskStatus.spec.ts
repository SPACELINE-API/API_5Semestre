import { expect, test } from '@playwright/test';
import type { TaskStatus } from '../types/task';
import { formatDueDate } from '../utils/format';
import {
	canReview,
	countByStatus,
	employeeActionsFor,
	showsRejectionReason,
} from '../utils/taskStatus';

function actions(status: TaskStatus, description: string | null = null) {
	return employeeActionsFor({ status, execution_description: description });
}

test.describe('ações do funcionário por status', () => {
	test('tarefa pendente só pode ser iniciada', () => {
		expect(actions('pending')).toEqual({
			canStart: true,
			canEditExecution: false,
			canSubmit: false,
			canResume: false,
		});
	});

	test('em andamento permite registrar a execução e anexar', () => {
		expect(actions('in_progress').canEditExecution).toBe(true);
		expect(actions('in_progress').canStart).toBe(false);
	});

	test('envio para análise exige a descrição da execução salva', () => {
		expect(actions('in_progress').canSubmit).toBe(false);
		expect(actions('in_progress', '   ').canSubmit).toBe(false);
		expect(actions('in_progress', 'Contratos organizados').canSubmit).toBe(
			true,
		);
	});

	test('tarefa reprovada só pode ser retomada', () => {
		expect(actions('rejected', 'feito')).toEqual({
			canStart: false,
			canEditExecution: false,
			canSubmit: false,
			canResume: true,
		});
	});

	test('em análise e concluída não aceitam ações do funcionário', () => {
		for (const status of ['in_review', 'completed'] as const) {
			expect(Object.values(actions(status, 'feito'))).not.toContain(true);
		}
	});
});

test.describe('avaliação e motivo da reprovação', () => {
	test('somente tarefas em análise podem ser avaliadas', () => {
		expect(canReview({ status: 'in_review' })).toBe(true);
		for (const status of [
			'pending',
			'in_progress',
			'completed',
			'rejected',
		] as const) {
			expect(canReview({ status })).toBe(false);
		}
	});

	test('o motivo aparece enquanto a tarefa não for concluída', () => {
		expect(
			showsRejectionReason({ status: 'rejected', rejection_reason: 'Faltou' }),
		).toBe(true);
		expect(
			showsRejectionReason({
				status: 'in_progress',
				rejection_reason: 'Faltou',
			}),
		).toBe(true);
		expect(
			showsRejectionReason({ status: 'completed', rejection_reason: 'Faltou' }),
		).toBe(false);
		expect(
			showsRejectionReason({ status: 'rejected', rejection_reason: null }),
		).toBe(false);
	});
});

test.describe('contagem e formatação', () => {
	test('conta as tarefas de cada um dos cinco status', () => {
		expect(
			countByStatus([
				{ status: 'pending' },
				{ status: 'pending' },
				{ status: 'completed' },
			]),
		).toEqual({
			pending: 2,
			in_progress: 0,
			in_review: 0,
			rejected: 0,
			completed: 1,
		});
	});

	test('o prazo mostra o mesmo dia informado, sem efeito de fuso horário', () => {
		expect(formatDueDate('2026-11-30')).toBe('30/11/2026');
		expect(formatDueDate(null)).toBe('Sem prazo');
	});
});
