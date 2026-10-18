import {
	apiGetAuth,
	apiPatchAuth,
	apiUrl,
} from '../../../shared/services/apiClient';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
import { toUploadable } from '../../../shared/utils/toUploadable';
import type { NativeFile } from '../../../shared/types/file';
import type {
	TranslatorProfile,
	TranslatorProfileUpdateInput,
} from '../types/profile';

const PROFILE_PATH = '/api/translators/me';

export function getMyProfile(): Promise<TranslatorProfile> {
	return apiGetAuth<TranslatorProfile>(PROFILE_PATH);
}

export function updateMyProfile(
	data: TranslatorProfileUpdateInput,
): Promise<TranslatorProfile> {
	return apiPatchAuth<TranslatorProfile, TranslatorProfileUpdateInput>(
		PROFILE_PATH,
		data,
	);
}

export async function uploadMyPhoto(
	file: NativeFile,
): Promise<TranslatorProfile> {
	return uploadFileMultipart<TranslatorProfile>(
		`${apiUrl}${PROFILE_PATH}/photo`,
		await toUploadable(file),
		{},
		'POST',
	);
}
