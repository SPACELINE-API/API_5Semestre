import { Platform, View, Text } from 'react-native';

type FilePreviewProps = {
	fileUrl: string;
	height?: number;
};

export function FilePreview({ fileUrl, height = 320 }: FilePreviewProps) {
	if (Platform.OS !== 'web') {
		return (
			<Text className="font-inter text-gray-400 text-sm">
				A pré-visualização está disponível apenas na versão web por enquanto.
			</Text>
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
