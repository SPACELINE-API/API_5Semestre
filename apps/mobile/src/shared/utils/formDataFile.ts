import { Platform } from 'react-native';
import type { UploadableFile } from '../types/file';

export function appendFileToFormData(
	formData: FormData,
	field: string,
	file: UploadableFile,
) {
	if (Platform.OS === 'web') {
		formData.append(field, file as File);
		return;
	}

	const nativeFile = file as { uri: string; name: string; type: string };
	formData.append(
		field,
		nativeFile as unknown as Blob & { uri: string; name: string; type: string },
	);
}
