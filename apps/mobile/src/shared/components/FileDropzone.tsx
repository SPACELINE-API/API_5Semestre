import { useEffect, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { FileText, FileUp, RefreshCw } from 'lucide-react-native';
import { pickDocument } from '../utils/pickDocument';
import type { NativeFile } from '../types/file';

type FileDropzoneProps = {
	file: NativeFile | null;
	/** Tipos MIME oferecidos no seletor de arquivos. */
	accept: string[];
	/** Texto de apoio com formatos e tamanho aceitos. */
	hint: string;
	/** Informação extra do arquivo selecionado (ex.: tamanho). */
	selectedDetail?: string;
	disabled?: boolean;
	onFileSelected: (file: NativeFile) => void;
	onError?: (message: string) => void;
};

const SINGLE_FILE_MESSAGE = 'Envie apenas um arquivo por vez.';
const isWeb = Platform.OS === 'web';

function toNativeFile(file: File): NativeFile {
	return {
		uri: URL.createObjectURL(file),
		name: file.name,
		type: file.type || 'application/octet-stream',
		size: file.size,
	};
}

// AREA CINZA PARA ARRASTAR (WEB) OU IMPORTAR UM UNICO ARQUIVO
export function FileDropzone({
	file,
	accept,
	hint,
	selectedDetail,
	disabled = false,
	onFileSelected,
	onError,
}: FileDropzoneProps) {
	const dropRef = useRef<View>(null);
	const [isDragging, setIsDragging] = useState(false);
	const callbacks = useRef({ onFileSelected, onError });
	callbacks.current = { onFileSelected, onError };

	useEffect(() => {
		if (!isWeb || disabled) return;

		const node = dropRef.current as unknown as HTMLElement | null;
		if (!node?.addEventListener) return;

		let depth = 0;
		const prevent = (event: Event) => {
			event.preventDefault();
			event.stopPropagation();
		};
		const handleEnter = (event: DragEvent) => {
			prevent(event);
			depth += 1;
			setIsDragging(true);
		};
		const handleOver = (event: DragEvent) => {
			prevent(event);
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
		};
		const handleLeave = (event: DragEvent) => {
			prevent(event);
			depth = Math.max(0, depth - 1);
			if (depth === 0) setIsDragging(false);
		};
		const handleDrop = (event: DragEvent) => {
			prevent(event);
			depth = 0;
			setIsDragging(false);

			const files = event.dataTransfer?.files;
			if (!files || files.length === 0) return;
			if (files.length > 1) {
				callbacks.current.onError?.(SINGLE_FILE_MESSAGE);
				return;
			}
			callbacks.current.onFileSelected(toNativeFile(files[0]));
		};
		// EVITA QUE O NAVEGADOR ABRA O ARQUIVO SOLTO FORA DA AREA
		const blockWindowDrop = (event: Event) => event.preventDefault();

		node.addEventListener('dragenter', handleEnter);
		node.addEventListener('dragover', handleOver);
		node.addEventListener('dragleave', handleLeave);
		node.addEventListener('drop', handleDrop);
		window.addEventListener('dragover', blockWindowDrop);
		window.addEventListener('drop', blockWindowDrop);

		return () => {
			node.removeEventListener('dragenter', handleEnter);
			node.removeEventListener('dragover', handleOver);
			node.removeEventListener('dragleave', handleLeave);
			node.removeEventListener('drop', handleDrop);
			window.removeEventListener('dragover', blockWindowDrop);
			window.removeEventListener('drop', blockWindowDrop);
		};
	}, [disabled]);

	async function handleImport() {
		const picked = await pickDocument({ types: accept });
		if (picked) onFileSelected(picked);
	}

	return (
		<View
			ref={dropRef}
			className={`items-center gap-3 rounded-xl border-2 border-dashed px-4 py-6 ${
				isDragging
					? 'border-blue-400 bg-blue-50'
					: 'border-gray-300 bg-gray-100'
			} ${disabled ? 'opacity-60' : ''}`}
		>
			{file ? (
				<>
					<View className="h-12 w-12 items-center justify-center rounded-full bg-white">
						<FileText size={24} color="#1D4ED8" />
					</View>
					<View className="w-full items-center gap-0.5">
						<Text
							className="text-center font-inter font-semibold text-gray-900 text-sm"
							numberOfLines={2}
						>
							{file.name}
						</Text>
						{selectedDetail ? (
							<Text className="font-inter text-gray-500 text-xs">
								{selectedDetail}
							</Text>
						) : null}
					</View>
					<TouchableOpacity
						onPress={() => void handleImport()}
						disabled={disabled}
						accessibilityRole="button"
						className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2"
					>
						<RefreshCw size={14} color="#374151" />
						<Text className="font-inter font-semibold text-gray-800 text-xs">
							Trocar arquivo
						</Text>
					</TouchableOpacity>
				</>
			) : (
				<>
					<View className="h-12 w-12 items-center justify-center rounded-full bg-white">
						<FileUp size={24} color="#6B7280" />
					</View>
					<View className="items-center gap-1">
						<Text className="text-center font-inter font-medium text-gray-700 text-sm">
							{isWeb
								? isDragging
									? 'Solte o arquivo para anexar'
									: 'Arraste o arquivo para cá'
								: 'Selecione o arquivo no seu dispositivo'}
						</Text>
						{isWeb && (
							<Text className="font-inter text-gray-400 text-xs">ou</Text>
						)}
					</View>
					<TouchableOpacity
						onPress={() => void handleImport()}
						disabled={disabled}
						accessibilityRole="button"
						className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5"
					>
						<FileUp size={16} color="#FFFFFF" />
						<Text className="font-inter font-semibold text-sm text-white">
							Importar documento
						</Text>
					</TouchableOpacity>
				</>
			)}
			<Text className="text-center font-inter text-gray-500 text-xs">
				{hint}
			</Text>
		</View>
	);
}
