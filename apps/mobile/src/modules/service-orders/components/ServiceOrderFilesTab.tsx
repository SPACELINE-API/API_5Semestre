import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { FileText, Upload } from 'lucide-react-native';
import type {
	ServiceOrderFile,
	ServiceOrderFileDirection,
	ServiceOrderItem,
} from '../types/serviceOrder';
import type { UploadableFile } from '../../../shared/types/file';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { FilePreview } from '../../../shared/components/FilePreview';
import { formatDate } from '../utils/format';

type ServiceOrderFilesTabProps = {
	items: ServiceOrderItem[];
	files: ServiceOrderFile[];
	onUpload: (
		file: UploadableFile,
		direction: ServiceOrderFileDirection,
	) => Promise<void>;
};

type DisplayFile = {
	id: string;
	label: string;
	fileUrl: string;
	uploadedAt: string | null;
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
	}));
}

function FileGroupList({
	title,
	files,
}: {
	title: string;
	files: DisplayFile[];
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
				<View key={file.id}>
					<View className="flex-row items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
						<View className="flex-1 flex-row items-center gap-2">
							<FileText size={16} color="#1C6FB0" />
							<Text
								className="flex-1 font-inter font-medium text-blue-600 text-sm"
								numberOfLines={1}
							>
								{file.label}
							</Text>
						</View>

						<View className="flex-row items-center gap-2">
							{file.uploadedAt && (
								<Text className="font-inter text-gray-400 text-xs">
									{formatDate(file.uploadedAt)}
								</Text>
							)}
						</View>
					</View>
					<FilePreview fileUrl={file.fileUrl} openInNewPage />
				</View>
			))}
		</View>
	);
}

export function ServiceOrderFilesTab({
	items,
	files,
	onUpload,
}: ServiceOrderFilesTabProps) {
	const [isUploading, setIsUploading] =
		useState<ServiceOrderFileDirection | null>(null);
	const [selectionError, setSelectionError] = useState<string | null>(null);

	const entradaFiles = [
		...itemsToDisplayFiles(items),
		...serviceOrderFilesToDisplayFiles(
			files.filter((file) => file.direction === 'entrada'),
		),
	];
	const saidaFiles = serviceOrderFilesToDisplayFiles(
		files.filter((file) => file.direction === 'saida'),
	);

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

	function renderUploadButton(direction: ServiceOrderFileDirection) {
		const isThisUploading = isUploading === direction;

		return (
			<View style={{ position: 'relative' }}>
				<TouchableOpacity
					onPress={
						Platform.OS === 'web'
							? undefined
							: () => handlePickNativeFile(direction)
					}
					disabled={isThisUploading}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Enviar arquivo de ${direction === 'entrada' ? 'partida' : 'chegada'}`}
					className={`flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 ${isThisUploading ? 'opacity-60' : ''}`}
				>
					<Upload size={14} color="#353535" />
					<Text className="font-inter font-semibold text-gray-800 text-xs">
						{isThisUploading ? 'Enviando…' : 'Enviar arquivo'}
					</Text>
				</TouchableOpacity>

				{Platform.OS === 'web' && (
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

	return (
		<View className="gap-8">
			{selectionError && (
				<Text accessibilityRole="alert" className="font-inter text-red-700 text-sm">
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

				<FileGroupList title="Enviados pelo cliente" files={entradaFiles} />
			</View>

			<View className="gap-3 border-t border-gray-100 pt-7">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-semibold text-gray-900 text-sm">
						Arquivos de chegada
					</Text>

					{renderUploadButton('saida')}
				</View>

				<FileGroupList title="Entregues ao cliente" files={saidaFiles} />
			</View>
		</View>
	);
}
