import * as DocumentPicker from 'expo-document-picker';
import type { NativeFile } from '../types/file';

export async function pickDocument(): Promise<NativeFile | null> {
	const result = await DocumentPicker.getDocumentAsync({
		copyToCacheDirectory: true,
	});

	if (result.canceled || !result.assets?.[0]) return null;

	const asset = result.assets[0];
	return {
		uri: asset.uri,
		name: asset.name,
		type: asset.mimeType ?? 'application/octet-stream',
	};
}
