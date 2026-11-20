import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { approveTask, rejectTask } from '../services/taskService';
import type { Task } from '../types/task';
import { personName } from '../utils/format';
import { canReview } from '../utils/taskStatus';
import { TaskAttachments } from './TaskAttachments';
import { TaskInfo } from './TaskInfo';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const REASON_MAX = 2000;

type Step = 'details' | 'confirm-approve' | 'reject';

type TaskReviewModalProps = {
	task: Task | null;
	// SO QUEM TEM tasks.review APROVA OU REPROVA; OS DEMAIS APENAS ACOMPANHAM
	canReview: boolean;
	onClose: () => void;
	onReviewed: (task: Task, message: string) => void;
};

export function TaskReviewModal({
	task,
	canReview: hasReviewPermission,
	onClose,
	onReviewed,
}: TaskReviewModalProps) {
	const themeColors = useThemeColors();
	const [step, setStep] = useState<Step>('details');
	const [reason, setReason] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!task) return null;

	const isReviewable = hasReviewPermission && canReview(task);

	const assignee = personName(task.assignee);

	function close() {
		setStep('details');
		setReason('');
		setError(null);
		onClose();
	}

	async function submit(request: () => Promise<Task>, message: string) {
		setIsSaving(true);
		setError(null);
		try {
			const updated = await request();
			setStep('details');
			setReason('');
			onReviewed(updated, message);
		} catch (cause) {
			setError(
				cause instanceof Error && cause.message
					? cause.message
					: 'Não foi possível registrar a avaliação. Tente novamente.',
			);
			setStep('details');
		} finally {
			setIsSaving(false);
		}
	}

	const currentTask = task;

	if (step === 'confirm-approve') {
		return (
			<AppModal
				key="confirm-approve"
				visible
				type="confirmation"
				title="Aprovar tarefa?"
				message={`A tarefa de ${assignee} será marcada como concluída.`}
				confirmLabel="Aprovar"
				isLoading={isSaving}
				onConfirm={() =>
					void submit(() => approveTask(currentTask.id), 'Tarefa aprovada.')
				}
				onClose={() => setStep('details')}
			/>
		);
	}

	if (step === 'reject') {
		const trimmedReason = reason.trim();
		return (
			<AppModal
				key="reject"
				visible
				title="Reprovar tarefa"
				message={`Informe a justificativa da reprovação. ${assignee} verá esta mensagem.`}
				confirmLabel="Reprovar"
				confirmDisabled={!trimmedReason}
				isLoading={isSaving}
				onConfirm={() =>
					void submit(
						() => rejectTask(currentTask.id, trimmedReason),
						'Tarefa reprovada.',
					)
				}
				onClose={() => setStep('details')}
			>
				<View className="gap-1.5">
					<Text className="font-inter font-medium text-foreground-secondary text-[13px]">
						Justificativa
					</Text>
					<TextInput
						value={reason}
						onChangeText={setReason}
						multiline
						maxLength={REASON_MAX}
						placeholder="Ex.: faltaram os contratos do cliente Acme"
						placeholderTextColor={themeColors.foregroundSubtle}
						accessibilityLabel="Justificativa da reprovação"
						textAlignVertical="top"
						className="min-h-[96px] rounded-lg border border-border-strong px-3 py-2.5 font-inter text-sm text-foreground outline-none"
					/>
					<View className="flex-row justify-between">
						<Text className="font-inter text-foreground-muted text-xs">
							{trimmedReason ? '' : 'A justificativa é obrigatória.'}
						</Text>
						<Text className="font-inter text-foreground-subtle text-xs">
							{reason.length}/{REASON_MAX}
						</Text>
					</View>
				</View>
			</AppModal>
		);
	}

	// SOMENTE TAREFAS EM ANALISE PODEM SER AVALIADAS
	const footer = isReviewable ? (
		<>
			<TouchableOpacity
				onPress={() => setStep('reject')}
				accessibilityRole="button"
				accessibilityLabel="Reprovar tarefa"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-danger/40 px-4 py-2.5"
			>
				<X size={16} color={themeColors.danger} />
				<Text className="font-inter font-semibold text-danger text-sm">
					Reprovar
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => setStep('confirm-approve')}
				accessibilityRole="button"
				accessibilityLabel="Aprovar tarefa"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5"
			>
				<Check size={16} color={themeColors.primaryForeground} />
				<Text className="font-inter font-semibold text-sm text-primary-foreground">
					Aprovar
				</Text>
			</TouchableOpacity>
		</>
	) : (
		<TouchableOpacity
			onPress={close}
			accessibilityRole="button"
			className="flex-1 items-center rounded-lg bg-primary px-4 py-2.5"
		>
			<Text className="font-inter font-semibold text-sm text-primary-foreground">
				Fechar
			</Text>
		</TouchableOpacity>
	);

	return (
		<AppModal
			key="details"
			visible
			size="md"
			title="Avaliação da tarefa"
			footer={footer}
			onClose={close}
		>
			<TaskInfo task={task} showAssignee />

			<View className="gap-2">
				<Text className="font-inter font-semibold text-foreground text-sm">
					Descrição da execução
				</Text>
				<Text className="font-inter text-foreground-secondary text-sm">
					{task.execution_description || 'Nenhuma descrição registrada.'}
				</Text>
			</View>

			<TaskAttachments task={task} editable={false} />

			{!isReviewable && (
				<Text className="font-inter text-foreground-muted text-xs">
					{canReview(task) && !hasReviewPermission
						? 'A tarefa está em análise. A aprovação ou reprovação é feita por quem tem permissão para avaliar tarefas.'
						: 'Somente tarefas em análise podem ser aprovadas ou reprovadas.'}
				</Text>
			)}

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
