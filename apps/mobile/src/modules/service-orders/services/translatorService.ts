import { apiGetAuth } from '../../../shared/services/apiClient';
import type { Translator } from '../types/serviceOrder';

const TRANSLATORS_PATH = '/api/translators';

export function listTranslators(): Promise<Translator[]> {
	return apiGetAuth<Translator[]>(TRANSLATORS_PATH);
}
