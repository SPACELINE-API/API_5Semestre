import { apiGet } from '../../../shared/services/apiClient';
import type {
	TranslatorPage,
	TranslatorSearchParams,
} from '../types/translator';

const TRANSLATORS_PATH = '/api/translators';

export function searchTranslators(
	params: TranslatorSearchParams = {},
): Promise<TranslatorPage> {
	const query = new URLSearchParams();

	if (params.language) query.set('language', params.language);
	if (params.specialty) query.set('specialty', params.specialty);
	if (params.status !== undefined) query.set('status', String(params.status));
	if (params.page !== undefined) query.set('page', String(params.page));
	if (params.page_size !== undefined) {
		query.set('page_size', String(params.page_size));
	}

	const queryString = query.toString();
	return apiGet<TranslatorPage>(
		queryString ? `${TRANSLATORS_PATH}?${queryString}` : TRANSLATORS_PATH,
	);
}
