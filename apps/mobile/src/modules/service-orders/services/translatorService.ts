import { apiGet } from '../../../shared/services/apiClient';
import type { Translator } from '../types/serviceOrder';

const TRANSLATORS_PATH = '/api/translators';

export function listTranslators(): Promise<Translator[]> {
	return apiGet<Translator[]>(TRANSLATORS_PATH);
}
