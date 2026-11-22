import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { DateField } from '../../../shared/components/DateField';
import { SelectField } from '../../../shared/components/SelectField';
import { createTask, listTaskAssignees } from '../services/taskService';
import type { Task, TaskPerson } from '../types/task';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const DESCRIPTION_MAX = 5000;

type CreateTaskModalProps = {
	visible: boolean;
	onClose: () => void;
	onCreated: (task: Task) => void;
};

function today() {
	const now = new Date();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}

function assigneeLabel(person: TaskPerson) {
	return person.name?.trim()
		? `${person.name} (${person.email})`
		: person.email;
}

// CRIACAO DE TAREFA PARA EXATAMENTE UM FUNCIONARIO INTERNO
export function CreateTaskModal({
	visible,
	onClose,
	onCreated,
}: CreateTaskModalProps) {
	const themeColors = useThemeColors();
	const [assignees, setAssignees] = useState<TaskPerson[]>([]);
	const [loadingAssignees, setLoadingAssignees] = useState(false);
	const [assigneeId, setAssigneeId] = useState('');
	const [description, setDescription] = useState('');
	const [dueDate, setDueDate] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!visible) return;
		setAssigneeId('');
		setDescription('');
		setDueDate('');
		setError(null);
		setLoadingAssignees(true);
		listTaskAssignees()
			.then(setAssignees)
			.catch(() =>
				setError('Não foi possível carregar os funcionários. Tente novamente.'),
			)
			.finally(() => setLoadingAssignees(false));
	}, [visible]);

	if (!visible) return null;

	const trimmedDescription = description.trim();
	const canSubmit = Boolean(assigneeId) && Boolean(trimmedDescription);

	async function submit() {
		setIsSaving(true);
		setError(null);
		try {
			onCreated(
				await createTask({
					description: trimmedDescription,
					due_date: dueDate || null,
					assignee_id: assigneeId,
				}),
			);
		} catch (cause) {
			setError(
				cause instanceof Error && cause.message
					? cause.message
					: 'Não foi possível criar a tarefa. Tente novamente.',
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<AppModal
			visible
			size="md"
			title="Nova tarefa"
			message="A tarefa é atribuída a um funcionário interno, que poderá iniciá-la e enviá-la para análise."
			confirmLabel="Criar tarefa"
			confirmDisabled={!canSubmit}
			isLoading={isSaving}
			onConfirm={() => void submit()}
			onClose={onClose}
		>
			<View className="gap-1.5">
				{loadingAssignees ? (
					<View className="flex-row items-center gap-2 py-2">
						<ActivityIndicator
							size="small"
							color={themeColors.foregroundMuted}
						/>
						<Text className="font-inter text-foreground-muted text-sm">
							Carregando funcionários...
						</Text>
					</View>
				) : (
					<SelectField
						label="Responsável"
						value={assigneeId}
						allLabel="Selecione o funcionário"
						options={assignees.map((person) => ({
							value: person.id,
							label: assigneeLabel(person),
						}))}
						onChange={setAssigneeId}
					/>
				)}
			</View>

			<View className="gap-1.5">
				<Text className="font-inter font-semibold text-foreground text-xs">
					Descrição
				</Text>
				<TextInput
					value={description}
					onChangeText={setDescription}
					multiline
					maxLength={DESCRIPTION_MAX}
					editable={!isSaving}
					placeholder="Descreva o que precisa ser feito"
					placeholderTextColor={themeColors.foregroundSubtle}
					accessibilityLabel="Descrição da tarefa"
					textAlignVertical="top"
					className="min-h-[96px] rounded-lg border border-border-strong px-3 py-2.5 font-inter text-sm text-foreground outline-none"
				/>
				<Text className="self-end font-inter text-foreground-subtle text-xs">
					{description.length}/{DESCRIPTION_MAX}
				</Text>
			</View>

			<View className="gap-1.5">
				<DateField
					label="Prazo (opcional)"
					value={dueDate}
					onChangeText={setDueDate}
					placeholder="Sem prazo"
					minDate={today()}
				/>
				{dueDate ? (
					<TouchableOpacity
						onPress={() => setDueDate('')}
						accessibilityRole="button"
						className="self-start"
					>
						<Text className="font-inter font-medium text-primary-text text-xs">
							Remover prazo
						</Text>
					</TouchableOpacity>
				) : null}
			</View>

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
