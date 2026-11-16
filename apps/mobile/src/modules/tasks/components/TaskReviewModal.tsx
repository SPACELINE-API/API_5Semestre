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

const REASON_MAX = 2000;

type Step = 'details' | 'confirm-approve' | 'reject';

type TaskReviewModalProps = {
	task: Task | null;
	onClose: () => void;
	onReviewed: (task: Task, message: string) => void;
};

export function TaskReviewModal({
	task,
	onClose,
	onReviewed,
}: TaskReviewModalProps) {
	const [step, setStep] = useState<Step>('details');
	const [reason, setReason] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!task) return null;

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
					<Text className="font-inter font-medium text-gray-700 text-[13px]">
						Justificativa
					</Text>
					<TextInput
						value={reason}
						onChangeText={setReason}
						multiline
						maxLength={REASON_MAX}
						placeholder="Ex.: faltaram os contratos do cliente Acme"
						placeholderTextColor="#9CA3AF"
						accessibilityLabel="Justificativa da reprovação"
						textAlignVertical="top"
						className="min-h-[96px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
					/>
					<View className="flex-row justify-between">
						<Text className="font-inter text-gray-500 text-xs">
							{trimmedReason ? '' : 'A justificativa é obrigatória.'}
						</Text>
						<Text className="font-inter text-gray-400 text-xs">
							{reason.length}/{REASON_MAX}
						</Text>
					</View>
				</View>
			</AppModal>
		);
	}

	// SOMENTE TAREFAS EM ANALISE PODEM SER AVALIADAS
	const footer = canReview(task) ? (
		<>
			<TouchableOpacity
				onPress={() => setStep('reject')}
				accessibilityRole="button"
				accessibilityLabel="Reprovar tarefa"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5"
			>
				<X size={16} color="#B91C1C" />
				<Text className="font-inter font-semibold text-red-700 text-sm">
					Reprovar
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => setStep('confirm-approve')}
				accessibilityRole="button"
				accessibilityLabel="Aprovar tarefa"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5"
			>
				<Check size={16} color="#FFFFFF" />
				<Text className="font-inter font-semibold text-sm text-white">
					Aprovar
				</Text>
			</TouchableOpacity>
		</>
	) : (
		<TouchableOpacity
			onPress={close}
			accessibilityRole="button"
			className="flex-1 items-center rounded-lg bg-blue-600 px-4 py-2.5"
		>
			<Text className="font-inter font-semibold text-sm text-white">
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
				<Text className="font-inter font-semibold text-gray-800 text-sm">
					Descrição da execução
				</Text>
				<Text className="font-inter text-gray-700 text-sm">
					{task.execution_description || 'Nenhuma descrição registrada.'}
				</Text>
			</View>

			<TaskAttachments task={task} editable={false} />

			{!canReview(task) && (
				<Text className="font-inter text-gray-500 text-xs">
					Somente tarefas em análise podem ser aprovadas ou reprovadas.
				</Text>
			)}

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
