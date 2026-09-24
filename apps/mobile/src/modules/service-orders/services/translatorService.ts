import { apiGet } from '../../../shared/services/apiClient';
import type { Translator } from '../types/serviceOrder';

const TRANSLATORS_PATH = '/api/translators';

// A API pagina os resultados (envelope { items, total, page, page_size}).
// Este dropdown de convite não pagina; busca até 100 tradutores de uma vez.
type TranslatorPage = { items: Translator[]; total: number };

export async function listTranslators(): Promise<Translator[]> {
	const result = await apiGet<TranslatorPage>(
		`${TRANSLATORS_PATH}?page_size=100`,
	);
	return result.items;
}
