import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import type { NativeFile } from '../types/file';

export async function pickDocument(): Promise<NativeFile | null> {
	const result = await DocumentPicker.getDocumentAsync({
		copyToCacheDirectory: Platform.OS !== 'android',
	});

	if (result.canceled || !result.assets?.[0]) return null;

	const asset = result.assets[0];
	return {
		uri: asset.uri,
		name: asset.name,
		type: asset.mimeType ?? 'application/octet-stream',
	};
}
