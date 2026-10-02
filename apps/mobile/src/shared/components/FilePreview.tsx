import { Platform, View, Text, TouchableOpacity, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { FileText } from 'lucide-react-native';

type FilePreviewProps = {
	fileUrl: string;
	height?: number;
	openInNewPage?: boolean;
	compact?: boolean;
};

function getNativeDocumentUrl(fileUrl: string) {
	if (Platform.OS === 'web') return fileUrl;

	try {
		const url = new URL(fileUrl);
		if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
			return fileUrl;
		}

		const hostUri = Constants.expoConfig?.hostUri;
		if (!hostUri) return fileUrl;

		const expoHost = new URL(`http://${hostUri}`).hostname;
		if (['localhost', '127.0.0.1', '::1'].includes(expoHost)) return fileUrl;

		url.hostname = expoHost;
		return url.toString();
	} catch {
		return fileUrl;
	}
}

export function openDocument(fileUrl: string) {
	if (Platform.OS === 'web') {
		const viewer = window.open('about:blank', '_blank');
		if (viewer) viewer.location.href = fileUrl;
		return;
	}

	void Linking.openURL(getNativeDocumentUrl(fileUrl));
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
						? Linking.openURL(getNativeDocumentUrl(fileUrl))
						: WebBrowser.openBrowserAsync(fileUrl)
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
				src={fileUrl}
				title="Pré-visualização do documento"
				style={{ width: '100%', height: '100%', border: 'none' }}
			/>
		</View>
	);
}
