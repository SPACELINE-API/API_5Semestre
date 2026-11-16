import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import {
	resumeTask,
	startTask,
	submitTask,
	updateTaskExecution,
} from '../services/taskService';
import type { Task } from '../types/task';
import { employeeActionsFor } from '../utils/taskStatus';
import { TaskAttachments } from './TaskAttachments';
import { TaskInfo } from './TaskInfo';

const EXECUTION_MAX = 5000;

type TaskDetailsModalProps = {
	task: Task | null;
	onClose: () => void;
	onChanged: (task: Task, message?: string) => void;
};

type PendingAction = 'start' | 'save' | 'submit' | 'resume';

export function TaskDetailsModal({
	task,
	onClose,
	onChanged,
}: TaskDetailsModalProps) {
	const [draft, setDraft] = useState('');
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [error, setError] = useState<string | null>(null);

	const savedDescription = task?.execution_description ?? '';
	useEffect(() => {
		setDraft(savedDescription);
		setError(null);
	}, [task?.id, savedDescription]);

	if (!task) return null;

	const actions = employeeActionsFor(task);
	const trimmedDraft = draft.trim();
	const hasUnsavedChanges = trimmedDraft !== savedDescription.trim();
	const isBusy = pending !== null;

	async function run(
		action: PendingAction,
		request: () => Promise<Task>,
		message: string,
	) {
		setPending(action);
		setError(null);
		try {
			onChanged(await request(), message);
		} catch (cause) {
			setError(
				cause instanceof Error && cause.message
					? cause.message
					: 'Não foi possível concluir a ação. Tente novamente.',
			);
		} finally {
			setPending(null);
		}
	}

	const currentTask = task;

	function primaryButton(
		label: string,
		action: PendingAction,
		onPress: () => void,
		disabled = false,
	) {
		const isLoading = pending === action;
		return (
			<TouchableOpacity
				onPress={onPress}
				disabled={isBusy || disabled}
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ disabled: isBusy || disabled, busy: isLoading }}
				className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 ${
					isBusy || disabled ? 'opacity-50' : ''
				}`}
			>
				{isLoading && <ActivityIndicator size="small" color="#FFFFFF" />}
				<Text className="font-inter font-semibold text-sm text-white">
					{isLoading ? 'Aguarde…' : label}
				</Text>
			</TouchableOpacity>
		);
	}

	const footer = (
		<>
			<TouchableOpacity
				onPress={onClose}
				disabled={isBusy}
				accessibilityRole="button"
				className="flex-1 items-center rounded-lg border border-gray-300 px-4 py-2.5"
			>
				<Text className="font-inter font-medium text-gray-800 text-sm">
					Fechar
				</Text>
			</TouchableOpacity>
			{actions.canStart &&
				primaryButton(
					'Iniciar tarefa',
					'start',
					() =>
						void run(
							'start',
							() => startTask(currentTask.id),
							'Tarefa iniciada.',
						),
				)}
			{task.status === 'in_progress' &&
				primaryButton(
					'Enviar para análise',
					'submit',
					() =>
						void run(
							'submit',
							() => submitTask(currentTask.id),
							'Tarefa enviada para análise.',
						),
					!actions.canSubmit || hasUnsavedChanges,
				)}
			{actions.canResume &&
				primaryButton(
					'Retomar tarefa',
					'resume',
					() =>
						void run(
							'resume',
							() => resumeTask(currentTask.id),
							'Tarefa retomada.',
						),
				)}
		</>
	);

	return (
		<AppModal
			visible
			size="md"
			title="Detalhes da tarefa"
			footer={footer}
			onClose={onClose}
			isLoading={isBusy}
		>
			<TaskInfo task={task} />

			<View className="gap-2">
				<Text className="font-inter font-semibold text-gray-800 text-sm">
					Descrição da execução
				</Text>
				{actions.canEditExecution ? (
					<>
						<TextInput
							value={draft}
							onChangeText={setDraft}
							multiline
							maxLength={EXECUTION_MAX}
							editable={!isBusy}
							placeholder="Descreva o que foi feito nesta tarefa"
							placeholderTextColor="#9CA3AF"
							accessibilityLabel="Descrição da execução"
							textAlignVertical="top"
							className="min-h-[96px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
						/>
						<View className="flex-row items-center justify-between gap-2">
							<Text className="font-inter text-gray-400 text-xs">
								{draft.length}/{EXECUTION_MAX}
							</Text>
							<TouchableOpacity
								onPress={() =>
									void run(
										'save',
										() => updateTaskExecution(currentTask.id, trimmedDraft),
										'Descrição da execução salva.',
									)
								}
								disabled={isBusy || !trimmedDraft || !hasUnsavedChanges}
								accessibilityRole="button"
								accessibilityLabel="Salvar descrição"
								className={`flex-row items-center gap-2 rounded-lg border border-blue-600 px-3 py-2 ${
									isBusy || !trimmedDraft || !hasUnsavedChanges
										? 'opacity-50'
										: ''
								}`}
							>
								{pending === 'save' && (
									<ActivityIndicator size="small" color="#1D4ED8" />
								)}
								<Text className="font-inter font-semibold text-blue-700 text-sm">
									Salvar descrição
								</Text>
							</TouchableOpacity>
						</View>
						{!actions.canSubmit && (
							<Text className="font-inter text-gray-500 text-xs">
								Salve a descrição da execução para poder enviar a tarefa para
								análise.
							</Text>
						)}
						{actions.canSubmit && hasUnsavedChanges && (
							<Text className="font-inter text-amber-700 text-xs">
								Há alterações não salvas na descrição.
							</Text>
						)}
					</>
				) : (
					<Text className="font-inter text-gray-700 text-sm">
						{savedDescription ||
							(task.status === 'pending'
								? 'Inicie a tarefa para registrar a execução.'
								: 'Nenhuma descrição registrada.')}
					</Text>
				)}
			</View>

			<TaskAttachments
				task={task}
				editable={actions.canEditExecution}
				onChanged={(updated) => onChanged(updated)}
			/>

			{error && (
				<Text
					accessibilityRole="alert"
					className="font-inter text-red-700 text-sm"
				>
					{error}
				</Text>
			)}
		</AppModal>
	);
}
