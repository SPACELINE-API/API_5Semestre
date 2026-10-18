import { apiGetAuth, apiUrl } from '../../../shared/services/apiClient';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
import { toUploadable } from '../../../shared/utils/toUploadable';
import type { NativeFile } from '../../../shared/types/file';
import type { TranslatorItem } from '../types/item';

const ITEMS_PATH = '/api/service-orders/items/me';

export function listMyItems(): Promise<TranslatorItem[]> {
	return apiGetAuth<TranslatorItem[]>(ITEMS_PATH);
}

export function getMyItem(itemId: string): Promise<TranslatorItem> {
	return apiGetAuth<TranslatorItem>(`${ITEMS_PATH}/${itemId}`);
}

export async function deliverMyItem(
	itemId: string,
	file: NativeFile,
): Promise<TranslatorItem> {
	return uploadFileMultipart<TranslatorItem>(
		`${apiUrl}${ITEMS_PATH}/${itemId}/delivery`,
		await toUploadable(file),
		{},
		'POST',
	);
}
