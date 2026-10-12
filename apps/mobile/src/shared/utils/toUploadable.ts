import { Platform } from 'react-native';
import type { NativeFile, UploadableFile } from '../types/file';

export async function toUploadable(file: NativeFile): Promise<UploadableFile> {
	if (Platform.OS !== 'web') return file;

	const blob = await (await fetch(file.uri)).blob();
	return new File([blob], file.name, { type: file.type || blob.type });
}
