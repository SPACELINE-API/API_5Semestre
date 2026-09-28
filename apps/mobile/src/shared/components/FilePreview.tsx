import { Platform, View, Text, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { FileText } from 'lucide-react-native';

type FilePreviewProps = {
	fileUrl: string;
	height?: number;
};

export function FilePreview({ fileUrl, height = 320 }: FilePreviewProps) {
	if (Platform.OS !== 'web') {
		return (
			<TouchableOpacity
				onPress={() => WebBrowser.openBrowserAsync(fileUrl)}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel="Abrir documento"
				className="flex-row items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3"
			>
				<FileText size={16} color="#1C6FB0" />
				<Text className="font-inter font-medium text-blue-600 text-sm">
					Toque para abrir o documento
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
