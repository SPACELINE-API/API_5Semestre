import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
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

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const EXECUTION_MAX = 5000;

type TaskDetailsModalProps = {
	task: Task | null;
	onClose: () => void;
	onChanged: (task: Task) => void;
};

type PendingAction = 'start' | 'save' | 'submit' | 'resume';

export function TaskDetailsModal({
	task,
	onClose,
	onChanged,
}: TaskDetailsModalProps) {
	const themeColors = useThemeColors();
	const [draft, setDraft] = useState('');
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [error, setError] = useState<string | null>(null);
	// A CONFIRMACAO FICA NO MODAL: NO CELULAR, O TOAST DA PAGINA FICA ATRAS DELE
	const [notice, setNotice] = useState<string | null>(null);

	const savedDescription = task?.execution_description ?? '';
	useEffect(() => {
		setDraft(savedDescription);
		setError(null);
	}, [task?.id, savedDescription]);

	useEffect(() => {
		setNotice(null);
	}, [task?.id]);

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
		setNotice(null);
		try {
			onChanged(await request());
			setNotice(message);
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
				className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 ${
					isBusy || disabled ? 'opacity-50' : ''
				}`}
			>
				{isLoading && (
					<ActivityIndicator
						size="small"
						color={themeColors.primaryForeground}
					/>
				)}
				<Text className="text-center font-inter font-semibold text-sm text-primary-foreground">
					{isLoading ? 'Aguarde…' : label}
				</Text>
			</TouchableOpacity>
		);
	}

	const buttons = (
		<>
			<TouchableOpacity
				onPress={onClose}
				disabled={isBusy}
				accessibilityRole="button"
				className="flex-1 items-center justify-center rounded-lg border border-border-strong px-4 py-2.5"
			>
				<Text className="font-inter font-medium text-foreground text-sm">
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

	// O RODAPE FICA SEMPRE VISIVEL, ENTAO A CONFIRMACAO APARECE ACIMA DOS BOTOES
	const footer = (
		<View className="flex-1 gap-3">
			{notice && (
				<View
					accessibilityRole="alert"
					className="flex-row items-center gap-2 rounded-lg bg-success-soft px-3 py-2"
				>
					<CheckCircle2 size={16} color={themeColors.successText} />
					<Text className="flex-1 font-inter font-medium text-success-text text-sm">
						{notice}
					</Text>
				</View>
			)}
			<View className="flex-row gap-3">{buttons}</View>
		</View>
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
				<Text className="font-inter font-semibold text-foreground text-sm">
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
							placeholderTextColor={themeColors.foregroundSubtle}
							accessibilityLabel="Descrição da execução"
							textAlignVertical="top"
							className="min-h-[96px] rounded-lg border border-border-strong px-3 py-2.5 font-inter text-sm text-foreground outline-none"
						/>
						<View className="flex-row items-center justify-between gap-2">
							<Text className="font-inter text-foreground-subtle text-xs">
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
								className={`flex-row items-center gap-2 rounded-lg border border-primary px-3 py-2 ${
									isBusy || !trimmedDraft || !hasUnsavedChanges
										? 'opacity-50'
										: ''
								}`}
							>
								{pending === 'save' && (
									<ActivityIndicator
										size="small"
										color={themeColors.primaryText}
									/>
								)}
								<Text className="font-inter font-semibold text-primary-text text-sm">
									Salvar descrição
								</Text>
							</TouchableOpacity>
						</View>
						{!actions.canSubmit && (
							<Text className="font-inter text-foreground-muted text-xs">
								Salve a descrição da execução para poder enviar a tarefa para
								análise.
							</Text>
						)}
						{actions.canSubmit && hasUnsavedChanges && (
							<Text className="font-inter text-warning-text text-xs">
								Há alterações não salvas na descrição.
							</Text>
						)}
					</>
				) : (
					<Text className="font-inter text-foreground-secondary text-sm">
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
				onChanged={onChanged}
			/>

			{error && (
				<Text
					accessibilityRole="alert"
					className="font-inter text-danger text-sm"
				>
					{error}
				</Text>
			)}
		</AppModal>
	);
}
