import { Platform, View, Text, TouchableOpacity, Linking } from 'react-native';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { FileText } from 'lucide-react-native';
import { resolveNativeResourceUrl } from '../utils/nativeResourceUrl';
import {
	getDownloadFileName,
	getDownloadMimeType,
	getDownloadUrl,
} from '../utils/fileDownload';

type FilePreviewProps = {
	fileUrl: string;
	height?: number;
	openInNewPage?: boolean;
	compact?: boolean;
};

function getNativeDocumentUrl(fileUrl: string) {
	return resolveNativeResourceUrl(
		getPreviewDocumentUrl(fileUrl),
		Constants.expoConfig?.hostUri,
		Platform.OS,
	);
}

export function getPreviewDocumentUrl(fileUrl: string) {
	try {
		const previewUrl = new URL(fileUrl);
		previewUrl.searchParams.delete('download');
		return previewUrl.toString();
	} catch {
		return fileUrl;
	}
}

export async function openDocument(fileUrl: string) {
	if (Platform.OS === 'web') {
		const viewer = window.open('about:blank', '_blank');
		if (!viewer) return;
		const previewUrl = getPreviewDocumentUrl(fileUrl);

		try {
			const response = await fetch(previewUrl);
			if (!response.ok)
				throw new Error(`Falha ao abrir o documento (${response.status}).`);
			const blobUrl = URL.createObjectURL(await response.blob());
			viewer.location.href = blobUrl;
			window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
		} catch {
			viewer.location.href = previewUrl;
		}
		return;
	}

	void Linking.openURL(getNativeDocumentUrl(fileUrl));
}

export async function downloadDocument(fileUrl: string) {
	const downloadUrl = getDownloadUrl(getNativeDocumentUrl(fileUrl));
	const fileName = getDownloadFileName(fileUrl);
	if (Platform.OS === 'web') {
		const response = await fetch(downloadUrl);
		if (!response.ok) {
			throw new Error(
				`Não foi possível baixar o arquivo (${response.status}).`,
			);
		}
		const blobUrl = URL.createObjectURL(await response.blob());
		const link = document.createElement('a');
		link.href = blobUrl;
		link.download = fileName;
		link.rel = 'noopener';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
		return 'downloaded';
	}

	if (Platform.OS === 'android') {
		const storage = LegacyFileSystem.StorageAccessFramework;
		const permission = await storage.requestDirectoryPermissionsAsync(
			storage.getUriForDirectoryInRoot('Download'),
		);
		if (!permission.granted) return 'cancelled';

		const extensionIndex = fileName.lastIndexOf('.');
		const displayName =
			extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
		const temporaryUri = `${LegacyFileSystem.cacheDirectory}${Date.now()}_${encodeURIComponent(fileName)}`;
		let destinationUri: string | undefined;

		try {
			const response = await LegacyFileSystem.downloadAsync(
				downloadUrl,
				temporaryUri,
			);
			if (response.status < 200 || response.status >= 300) {
				throw new Error(
					`Não foi possível baixar o arquivo (${response.status}).`,
				);
			}

			destinationUri = await storage.createFileAsync(
				permission.directoryUri,
				displayName,
				response.mimeType?.split(';')[0] || getDownloadMimeType(fileName),
			);
			const fileInfo = await LegacyFileSystem.getInfoAsync(temporaryUri);
			if (!fileInfo.exists || fileInfo.isDirectory) {
				throw new Error('O arquivo baixado não pôde ser lido.');
			}

			const chunkSize = 256 * 1024;
			for (let position = 0; position < fileInfo.size; position += chunkSize) {
				const chunk = await LegacyFileSystem.readAsStringAsync(temporaryUri, {
					encoding: LegacyFileSystem.EncodingType.Base64,
					position,
					length: Math.min(chunkSize, fileInfo.size - position),
				});
				await storage.writeAsStringAsync(destinationUri, chunk, {
					encoding: LegacyFileSystem.EncodingType.Base64,
					append: position > 0,
				});
			}
			return 'downloaded';
		} catch (error) {
			if (destinationUri) {
				await LegacyFileSystem.deleteAsync(destinationUri).catch(
					() => undefined,
				);
			}
			throw error;
		} finally {
			await LegacyFileSystem.deleteAsync(temporaryUri).catch(() => undefined);
		}
	}

	const downloadedFile = await File.downloadFileAsync(
		downloadUrl,
		new File(Paths.cache, fileName),
		{ idempotent: true },
	);
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error('O compartilhamento de arquivos não está disponível.');
	}
	await Sharing.shareAsync(downloadedFile.uri, {
		dialogTitle: `Salvar ${fileName}`,
	});
	return 'shared';
}

export function FilePreview({
	fileUrl,
	height = 320,
	openInNewPage = false,
	compact = false,
}: FilePreviewProps) {
	if (Platform.OS !== 'web') {
		return (
			<TouchableOpacity
				onPress={() =>
					openInNewPage
						? openDocument(fileUrl)
						: WebBrowser.openBrowserAsync(getNativeDocumentUrl(fileUrl))
				}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Abrir documento"
				className={`flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 ${compact ? 'border-0 bg-transparent px-0 py-1' : ''}`}
			>
				<FileText size={16} color="#1C6FB0" />
				<Text className="font-inter font-medium text-blue-600 text-sm">
					{compact ? 'Abrir' : 'Toque para abrir o documento'}
				</Text>
			</TouchableOpacity>
		);
	}

	if (openInNewPage) {
		return (
			<TouchableOpacity
				onPress={() => openDocument(fileUrl)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Abrir documento"
				className={`flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 ${compact ? 'border-0 bg-transparent px-0 py-1' : ''}`}
			>
				<FileText size={16} color="#1C6FB0" />
				<Text className="font-inter font-medium text-blue-600 text-sm">
					{compact ? 'Abrir' : 'Abrir documento'}
				</Text>
			</TouchableOpacity>
		);
	}

	return (
		<View
			className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
			style={{ height }}
		>
			<iframe
				src={getPreviewDocumentUrl(fileUrl)}
				title="Pré-visualização do documento"
				style={{ width: '100%', height: '100%', border: 'none' }}
			/>
		</View>
	);
}
