import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { ExternalLink, FileText, Trash2, Upload } from 'lucide-react-native';
import type {
	ServiceOrderFile,
	ServiceOrderFileDirection,
	ServiceOrderItem,
} from '../types/serviceOrder';
import type { UploadableFile } from '../../../shared/types/file';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { openDocument } from '../../../shared/components/FilePreview';
import { getFileName } from '../../../shared/utils/file';
import { formatDate } from '../utils/format';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';

export type ServiceOrderFileDeletionTarget =
	| { kind: 'item'; id: string; label: string }
	| { kind: 'file'; id: string; label: string };

type ServiceOrderFilesTabProps = {
	items: ServiceOrderItem[];
	files: ServiceOrderFile[];
	onUpload: (
		file: UploadableFile,
		direction: ServiceOrderFileDirection,
	) => Promise<void>;
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
	return (
		<View className="gap-2">
			<Text className="font-inter font-semibold text-gray-700 text-xs uppercase tracking-wide">
				{title}
			</Text>

			{files.length === 0 && (
				<Text className="font-inter text-gray-400 text-sm">
					Nenhum arquivo enviado.
				</Text>
			)}

			{files.map((file) => (
				<View
					key={file.id}
					className="flex-row items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
				>
					<TouchableOpacity
						accessibilityRole="link"
						onPress={() => openDocument(file.fileUrl)}
						className="min-w-0 max-w-[70%] flex-1 flex-row items-center gap-2"
					>
						<FileText size={16} color="#1C6FB0" />
						<Text
							className="min-w-0 flex-shrink font-inter font-medium text-blue-600 text-sm"
							numberOfLines={1}
						>
							{getFileName(file.fileUrl)}
						</Text>
						<ExternalLink size={13} color="#1d4ed8" />
					</TouchableOpacity>

					<View className="flex-row items-center gap-2">
						{file.uploadedAt && (
							<Text className="font-inter text-gray-400 text-xs">
								{formatDate(file.uploadedAt)}
							</Text>
						)}
						<TouchableOpacity
							onPress={() => onDelete(file.deletionTarget)}
							disabled={deletingId === file.deletionTarget.id}
							accessibilityRole="button"
							accessibilityLabel={`Excluir ${file.label}`}
							className="rounded-md p-2"
						>
							<Trash2 size={16} color="#B91C1C" />
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
	const [isUploading, setIsUploading] =
		useState<ServiceOrderFileDirection | null>(null);
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
	const saidaFilesList = files.filter((file) => file.direction === 'saida');
	const saidaFiles = serviceOrderFilesToDisplayFiles(saidaFilesList);

	const hasItems = items.length > 0;
	const canUploadDelivery =
		hasItems && items.every((item) => Boolean(item.translator_id));
	const deliveredCount = Math.min(saidaFilesList.length, items.length);
	const deliveryProgress = hasItems ? deliveredCount / items.length : 0;

	async function uploadFile(
		file: UploadableFile,
		direction: ServiceOrderFileDirection,
	) {
		setIsUploading(direction);
		try {
			await onUpload(file, direction);
		} finally {
			setIsUploading(null);
		}
	}

	async function handleFileSelected(
		fileList: FileList | null,
		direction: ServiceOrderFileDirection,
	) {
		const file = fileList?.[0];
		if (!file) return;
		await uploadFile(file, direction);
	}

	function renderUploadButton(
		direction: ServiceOrderFileDirection,
		disabled = false,
	) {
		const isThisUploading = isUploading === direction;
		const isDisabled = isThisUploading || disabled;

		return (
			<View style={{ position: 'relative' }}>
				<TouchableOpacity
					onPress={
						Platform.OS === 'web' || isDisabled
							? undefined
							: () => handlePickNativeFile(direction)
					}
					disabled={isDisabled}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Enviar arquivo de ${direction === 'entrada' ? 'partida' : 'chegada'}`}
					accessibilityState={{ disabled: isDisabled }}
					className={`flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 ${isDisabled ? 'opacity-60' : ''}`}
				>
					<Upload size={14} color="#353535" />
					<Text className="font-inter font-semibold text-gray-800 text-xs">
						{isThisUploading ? 'Enviando…' : 'Enviar arquivo'}
					</Text>
				</TouchableOpacity>

				{Platform.OS === 'web' && !isDisabled && (
					<input
						type="file"
						aria-label={`Selecionar arquivo de ${direction === 'entrada' ? 'partida' : 'chegada'}`}
						disabled={isThisUploading}
						style={{
							position: 'absolute',
							inset: 0,
							width: '100%',
							height: '100%',
							opacity: 0,
							cursor: 'pointer',
						}}
						onChange={(event: { target: HTMLInputElement }) => {
							const input = event.target;
							void handleFileSelected(input.files, direction);
							input.value = '';
						}}
					/>
				)}
			</View>
		);
	}

	async function handlePickNativeFile(direction: ServiceOrderFileDirection) {
		setSelectionError(null);
		try {
			const file = await pickDocument();
			if (!file) return;
			await uploadFile(file, direction);
		} catch {
			setSelectionError(
				'Não foi possível abrir o arquivo selecionado. Tente escolher outro arquivo.',
			);
		}
	}

	async function confirmDelete() {
		if (!pendingDeletion) return;
		setDeletingId(pendingDeletion.id);
		try {
			await onDelete(pendingDeletion);
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
					className="font-inter text-red-700 text-sm"
				>
					{selectionError}
				</Text>
			)}
			<View className="gap-3">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-semibold text-gray-900 text-sm">
						Arquivos de partida
					</Text>

					{renderUploadButton('entrada')}
				</View>

				<FileGroupList
					title="Enviados pelo cliente"
					files={entradaFiles}
					onDelete={setPendingDeletion}
					deletingId={deletingId}
				/>
			</View>

			<View className="gap-3 border-t border-gray-100 pt-7">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-semibold text-gray-900 text-sm">
						Arquivos de chegada
					</Text>

					{renderUploadButton('saida', !canUploadDelivery)}
				</View>

				{!canUploadDelivery && (
					<Text className="font-inter text-xs text-amber-700">
						{hasItems
							? 'Aguardando aceite de tradutor em todos os itens para liberar o envio de arquivos de entrega.'
							: 'Esta ordem de serviço não possui itens.'}
					</Text>
				)}

				{hasItems && (
					<View className="gap-1.5">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-medium text-gray-500 text-xs">
								Entregas
							</Text>
							<Text className="font-inter font-semibold text-gray-700 text-xs">
								{deliveredCount} de {items.length} itens entregues
							</Text>
						</View>
						<View className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
							<View
								className={`h-2 rounded-full ${
									deliveredCount >= items.length
										? 'bg-green-600'
										: 'bg-blue-500'
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
