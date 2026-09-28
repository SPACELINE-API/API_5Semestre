import {
	apiDelete,
	apiGet,
	apiPost,
	apiPut,
} from '../../../shared/services/apiClient';
import type {
	Translator,
	TranslatorCreateInput,
	TranslatorUpdateInput,
	QualificationResponse,
	DictionaryLanguagePairResponse,
} from '../types/translator';

const BASE = '/api/translators';

export function listQualifications(): Promise<QualificationResponse[]> {
	return apiGet<QualificationResponse[]>(`${BASE}/metadata/qualifications`);
}

export function listLanguagePairs(): Promise<DictionaryLanguagePairResponse[]> {
	return apiGet<DictionaryLanguagePairResponse[]>(
		`${BASE}/metadata/language-pairs`,
	);
}

export function listTranslators(): Promise<Translator[]> {
	return apiGet<Translator[]>(BASE);
}

export function createTranslator(
	data: TranslatorCreateInput,
): Promise<Translator> {
	return apiPost<Translator, TranslatorCreateInput>(BASE, data);
}

export function getTranslator(id: string): Promise<Translator> {
	return apiGet<Translator>(`${BASE}/${id}`);
}

export function updateTranslator(
	id: string,
	data: TranslatorUpdateInput,
): Promise<Translator> {
	return apiPut<Translator, TranslatorUpdateInput>(`${BASE}/${id}`, data);
}

export function deleteTranslator(id: string): Promise<void> {
	return apiDelete(`${BASE}/${id}`);
}
