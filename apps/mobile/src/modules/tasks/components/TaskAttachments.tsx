import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Eye, FileText, Paperclip, Trash2 } from 'lucide-react-native';
import { openDocument } from '../../../shared/components/FilePreview';
import { ApiError } from '../../../shared/services/publicApiClient';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { formatFileSize } from '../../translators/utils/profileFiles';
import {
	addTaskAttachment,
	getTaskAttachmentFile,
	removeTaskAttachment,
} from '../services/taskService';
import type { Task, TaskAttachment } from '../types/task';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type TaskAttachmentsProps = {
	task: Task;
	editable: boolean;
	onChanged?: (task: Task) => void;
};

function errorMessage(cause: unknown, fallback: string) {
	return cause instanceof Error && cause.message ? cause.message : fallback;
}

export function TaskAttachments({
	task,
	editable,
	onChanged,
}: TaskAttachmentsProps) {
	const themeColors = useThemeColors();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);
	const [isAdding, setIsAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleView(attachment: TaskAttachment) {
		setBusyId(attachment.id);
		setError(null);
		try {
			const file = await getTaskAttachmentFile(task.id, attachment.id);
			openDocument(file.url);
		} catch (cause) {
			setError(
				cause instanceof ApiError && cause.status === 404
					? 'O arquivo não foi encontrado no armazenamento.'
					: 'Não foi possível abrir o anexo. Tente novamente.',
			);
		} finally {
			setBusyId(null);
		}
	}

	async function handleAdd() {
		setError(null);
		const file = await pickDocument();
		if (!file) return;

		setIsAdding(true);
		try {
			onChanged?.(await addTaskAttachment(task.id, file));
		} catch (cause) {
			setError(errorMessage(cause, 'Não foi possível anexar o arquivo.'));
		} finally {
			setIsAdding(false);
		}
	}

	async function handleRemove(attachment: TaskAttachment) {
		setBusyId(attachment.id);
		setError(null);
		try {
			await removeTaskAttachment(task.id, attachment.id);
			onChanged?.({
				...task,
				attachments: task.attachments.filter(
					(item) => item.id !== attachment.id,
				),
			});
		} catch (cause) {
			setError(errorMessage(cause, 'Não foi possível remover o anexo.'));
		} finally {
			setBusyId(null);
			setConfirmingId(null);
		}
	}

	return (
		<View className="gap-2">
			<Text className="font-inter font-semibold text-foreground text-sm">
				Anexos
			</Text>

			{task.attachments.length === 0 && (
				<Text className="font-inter text-foreground-muted text-xs">
					Nenhum arquivo anexado.
				</Text>
			)}

			{task.attachments.map((attachment) => {
				const isBusy = busyId === attachment.id;
				const isConfirming = confirmingId === attachment.id;

				return (
					<View
						key={attachment.id}
						className="flex-row items-center gap-2 rounded-lg border border-border px-3 py-2.5"
					>
						<FileText size={16} color={themeColors.foregroundMuted} />
						<Text
							className="flex-1 font-inter text-foreground-secondary text-sm"
							numberOfLines={1}
						>
							{attachment.filename}
						</Text>
						<Text className="font-inter text-foreground-subtle text-xs">
							{formatFileSize(attachment.size_bytes)}
						</Text>
						{isBusy ? (
							<ActivityIndicator
								size="small"
								color={themeColors.foregroundSecondary}
							/>
						) : isConfirming ? (
							<>
								<TouchableOpacity
									onPress={() => void handleRemove(attachment)}
									accessibilityRole="button"
									accessibilityLabel={`Confirmar remoção de ${attachment.filename}`}
									className="rounded-md bg-danger px-2 py-1"
								>
									<Text className="font-inter font-semibold text-primary-foreground text-xs">
										Remover
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => setConfirmingId(null)}
									accessibilityRole="button"
									className="rounded-md border border-border-strong px-2 py-1"
								>
									<Text className="font-inter text-foreground-secondary text-xs">
										Cancelar
									</Text>
								</TouchableOpacity>
							</>
						) : (
							<>
								<TouchableOpacity
									onPress={() => void handleView(attachment)}
									accessibilityRole="button"
									accessibilityLabel={`Visualizar ${attachment.filename}`}
									hitSlop={6}
									className="rounded-md p-1"
								>
									<Eye size={16} color={themeColors.foregroundSecondary} />
								</TouchableOpacity>
								{editable && (
									<TouchableOpacity
										onPress={() => setConfirmingId(attachment.id)}
										accessibilityRole="button"
										accessibilityLabel={`Remover ${attachment.filename}`}
										hitSlop={6}
										className="rounded-md p-1"
									>
										<Trash2 size={16} color={themeColors.danger} />
									</TouchableOpacity>
								)}
							</>
						)}
					</View>
				);
			})}

			{editable && (
				<TouchableOpacity
					onPress={() => void handleAdd()}
					disabled={isAdding}
					accessibilityRole="button"
					accessibilityLabel="Anexar arquivo"
					className={`flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2.5 ${
						isAdding ? 'opacity-60' : ''
					}`}
				>
					{isAdding ? (
						<ActivityIndicator
							size="small"
							color={themeColors.foregroundSecondary}
						/>
					) : (
						<Paperclip size={16} color={themeColors.foregroundSecondary} />
					)}
					<Text className="font-inter font-semibold text-foreground text-sm">
						{isAdding ? 'Enviando…' : 'Anexar arquivo'}
					</Text>
				</TouchableOpacity>
			)}
			{editable && (
				<Text className="font-inter text-foreground-subtle text-xs">
					PDF, Word, planilha, texto ou imagem, até 10 MB.
				</Text>
			)}

			{error && (
				<Text
					accessibilityRole="alert"
					className="font-inter text-danger text-xs"
				>
					{error}
				</Text>
			)}
		</View>
	);
}
