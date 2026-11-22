import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
	ChevronDown,
	ChevronUp,
	ExternalLink,
	FileText,
	Trash2,
	Upload,
} from 'lucide-react-native';
import type {
	ServiceOrderFile,
	ServiceOrderFileDirection,
	ServiceOrderItem,
} from '../types/serviceOrder';
import type { UploadableFile } from '../../../shared/types/file';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { openDocument } from '../../../shared/components/FilePreview';
import { getTruncatedFileName } from '../../../shared/utils/file';
import { formatDate } from '../utils/format';
import { approvedDeliveries } from '../utils/fileReview';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const COLLAPSE_THRESHOLD = 3;

export type ServiceOrderFileDeletionTarget =
	| { kind: 'item'; id: string; label: string }
	| { kind: 'file'; id: string; label: string };

type ServiceOrderFilesTabProps = {
	items: ServiceOrderItem[];
	files: ServiceOrderFile[];
	onUpload: (
		file: UploadableFile,
		direction: ServiceOrderFileDirection,
	) => Promise<ServiceOrderFile>;
	onDelete: (target: ServiceOrderFileDeletionTarget) => Promise<void>;
};

type DisplayFile = {
	id: string;
	label: string;
	fileUrl: string;
	uploadedAt: string | null;
	deletionTarget: ServiceOrderFileDeletionTarget;
};

function itemsToDisplayFiles(items: ServiceOrderItem[]): DisplayFile[] {
	return items
		.filter((item): item is ServiceOrderItem & { file_url: string } =>
			Boolean(item.file_url),
		)
		.map((item) => ({
			id: `item-${item.id}`,
			label: `${item.source_language} → ${item.target_language}${
				item.document_type ? ` · ${item.document_type}` : ''
			}`,
			fileUrl: item.file_url,
			uploadedAt: null,
			deletionTarget: {
				kind: 'item',
				id: item.id,
				label: `${item.source_language} → ${item.target_language}`,
			},
		}));
}

function serviceOrderFilesToDisplayFiles(
	files: ServiceOrderFile[],
): DisplayFile[] {
	return files.map((file) => ({
		id: file.id,
		label: file.filename,
		fileUrl: file.file_url,
		uploadedAt: file.uploaded_at,
		deletionTarget: { kind: 'file', id: file.id, label: file.filename },
	}));
}

function FileGroupList({
	title,
	files,
	onDelete,
	deletingId,
}: {
	title: string;
	files: DisplayFile[];
	onDelete: (target: ServiceOrderFileDeletionTarget) => void;
	deletingId: string | null;
}) {
	const themeColors = useThemeColors();
	const canWriteDocuments = usePermission('documents.write');
	const [expanded, setExpanded] = useState(files.length <= COLLAPSE_THRESHOLD);
	const Chevron = expanded ? ChevronUp : ChevronDown;

	return (
		<View className="gap-2">
			<TouchableOpacity
				onPress={() => setExpanded((current) => !current)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} ${title}`}
				className="flex-row items-center justify-between gap-3 rounded-lg bg-surface-subtle px-3 py-2.5"
			>
				<View className="flex-row items-center gap-2">
					<Text className="font-inter font-semibold text-foreground-secondary text-xs uppercase tracking-wide">
						{title}
					</Text>
					<View className="rounded-full bg-surface px-2 py-0.5">
						<Text className="font-inter font-semibold text-foreground-secondary text-xs">
							{files.length}
						</Text>
					</View>
				</View>
				<Chevron size={16} color={themeColors.foregroundMuted} />
			</TouchableOpacity>

			{expanded && files.length === 0 && (
				<Text className="font-inter text-foreground-subtle text-sm">
					Nenhum arquivo enviado.
				</Text>
			)}

			{expanded &&
				files.map((file) => (
					<View
						key={file.id}
						className="flex-row items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
					>
						<TouchableOpacity
							accessibilityRole="link"
							onPress={() => openDocument(file.fileUrl)}
							className="min-w-0 max-w-full flex-row items-center gap-1"
						>
							<FileText size={16} color={themeColors.primary} />
							<Text
								className="min-w-0 flex-shrink font-inter font-medium text-primary-text text-xs"
								numberOfLines={1}
							>
								{getTruncatedFileName(file.fileUrl)}
							</Text>
							<ExternalLink size={13} color={themeColors.primaryText} />
						</TouchableOpacity>

						<View className="flex-row items-center gap-2">
							{file.uploadedAt && (
								<Text className="font-inter text-foreground-subtle text-xs">
									{formatDate(file.uploadedAt)}
								</Text>
							)}
							<TouchableOpacity
								onPress={() => onDelete(file.deletionTarget)}
								disabled={
									deletingId === file.deletionTarget.id || !canWriteDocuments
								}
								accessibilityRole="button"
								accessibilityLabel={`Excluir ${file.label}`}
								className={`rounded-md p-2 ${!canWriteDocuments ? 'opacity-40' : ''}`}
							>
								<Trash2 size={16} color={themeColors.danger} />
							</TouchableOpacity>
						</View>
					</View>
				))}
		</View>
	);
}

export function ServiceOrderFilesTab({
	items,
	files,
	onUpload,
	onDelete,
}: ServiceOrderFilesTabProps) {
	const themeColors = useThemeColors();
	const [isUploading, setIsUploading] = useState(false);
	const canWriteDocuments = usePermission('documents.write');
	const [uploadedDeliveryFiles, setUploadedDeliveryFiles] = useState<
		ServiceOrderFile[]
	>([]);
	const [selectionError, setSelectionError] = useState<string | null>(null);
	const [pendingDeletion, setPendingDeletion] =
		useState<ServiceOrderFileDeletionTarget | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const entradaFiles = [
		...itemsToDisplayFiles(items),
		...serviceOrderFilesToDisplayFiles(
			files.filter((file) => file.direction === 'entrada'),
		),
	];
	const saidaFilesList = [
		...approvedDeliveries(files),
		...approvedDeliveries(
			uploadedDeliveryFiles.filter(
				(uploadedFile) => !files.some((file) => file.id === uploadedFile.id),
			),
		),
	];
	const saidaFiles = serviceOrderFilesToDisplayFiles(saidaFilesList);

	const hasItems = items.length > 0;
	const canUploadDelivery =
		hasItems && items.every((item) => Boolean(item.translator_id));
	const deliveredCount = Math.min(saidaFilesList.length, items.length);
	const deliveryProgress = hasItems ? deliveredCount / items.length : 0;

	async function uploadDeliveryFile(file: UploadableFile) {
		setIsUploading(true);
		try {
			const uploadedFile = await onUpload(file, 'saida');
			setUploadedDeliveryFiles((current) =>
				current.some((item) => item.id === uploadedFile.id)
					? current
					: [...current, uploadedFile],
			);
		} finally {
			setIsUploading(false);
		}
	}

	async function handlePickDeliveryFile() {
		try {
			const file = await pickDocument();
			if (file) await uploadDeliveryFile(file);
		} catch {
			setSelectionError(
				'Não foi possível abrir o arquivo selecionado. Tente escolher outro arquivo.',
			);
		}
	}

	function renderDeliveryUploadButton() {
		const disabled = isUploading || !canUploadDelivery || !canWriteDocuments;
		return (
			<View>
				<TouchableOpacity
					onPress={disabled ? undefined : () => void handlePickDeliveryFile()}
					disabled={disabled}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel="Enviar arquivo de chegada"
					accessibilityState={{ disabled }}
					className={`flex-row items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 ${disabled ? 'opacity-60' : ''}`}
				>
					<Upload size={14} color={themeColors.foreground} />
					<Text className="font-inter font-semibold text-foreground text-xs">
						{isUploading ? 'Enviando…' : 'Enviar arquivo'}
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	async function confirmDelete() {
		if (!pendingDeletion) return;
		setDeletingId(pendingDeletion.id);
		try {
			await onDelete(pendingDeletion);
			if (pendingDeletion.kind === 'file') {
				setUploadedDeliveryFiles((current) =>
					current.filter((file) => file.id !== pendingDeletion.id),
				);
			}
			setPendingDeletion(null);
			setSelectionError(null);
		} catch (error) {
			setSelectionError(
				error instanceof Error
					? error.message
					: 'Não foi possível excluir o documento.',
			);
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<View className="gap-8">
			<ConfirmDialog
				visible={pendingDeletion !== null}
				title="Excluir documento?"
				message={`O vínculo de “${pendingDeletion?.label ?? ''}” será removido desta ordem de serviço.`}
				confirmLabel="Excluir"
				destructive
				isLoading={deletingId !== null}
				onConfirm={() => void confirmDelete()}
				onCancel={() => setPendingDeletion(null)}
			/>
			{selectionError && (
				<Text
					accessibilityRole="alert"
					className="font-inter text-danger text-sm"
				>
					{selectionError}
				</Text>
			)}
			<View className="gap-3">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-semibold text-foreground text-sm">
						Arquivos de partida
					</Text>
				</View>

				<FileGroupList
					title="Enviados pelo cliente"
					files={entradaFiles}
					onDelete={setPendingDeletion}
					deletingId={deletingId}
				/>
			</View>

			<View className="gap-3 border-t border-border-subtle pt-7">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-semibold text-foreground text-sm">
						Arquivos de chegada
					</Text>
					{renderDeliveryUploadButton()}
				</View>

				{!canUploadDelivery && (
					<Text className="font-inter text-xs text-warning-text">
						{hasItems
							? 'Aguardando aceite de tradutor em todos os itens para liberar o envio de arquivos de entrega.'
							: 'Esta ordem de serviço não possui itens.'}
					</Text>
				)}

				{hasItems && (
					<View className="gap-1.5">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-medium text-foreground-muted text-xs">
								Entregas
							</Text>
							<Text className="font-inter font-semibold text-foreground-secondary text-xs">
								{deliveredCount} de {items.length} itens entregues
							</Text>
						</View>
						<Text className="font-inter text-foreground-subtle text-xs">
							Só as entregas aprovadas na aba Revisão entram nesta contagem.
						</Text>
						<View className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
							<View
								className={`h-2 rounded-full ${
									deliveredCount >= items.length ? 'bg-success' : 'bg-primary'
								}`}
								style={{ width: `${Math.round(deliveryProgress * 100)}%` }}
							/>
						</View>
					</View>
				)}

				<FileGroupList
					title="Entregues ao cliente"
					files={saidaFiles}
					onDelete={setPendingDeletion}
					deletingId={deletingId}
				/>
			</View>
		</View>
	);
}
