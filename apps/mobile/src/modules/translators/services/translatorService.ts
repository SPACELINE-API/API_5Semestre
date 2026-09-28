import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
	apiPut,
} from '../../../shared/services/apiClient';
import type {
	Translator,
	TranslatorCreateInput,
	TranslatorUpdateInput,
	QualificationResponse,
	LanguageResponse,
} from '../types/translator';

const BASE = '/api/translators';

export function listQualifications(): Promise<QualificationResponse[]> {
	return apiGet<QualificationResponse[]>(`${BASE}/metadata/qualifications`);
}

export function listLanguages(): Promise<LanguageResponse[]> {
	return apiGet<LanguageResponse[]>('/api/support/languages');
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

export function setTranslatorActive(
	id: string,
	isActive: boolean,
): Promise<Translator> {
	return apiPatch<Translator, { is_active: boolean }>(`${BASE}/${id}/status`, {
		is_active: isActive,
	});
}

export function deleteTranslator(id: string): Promise<void> {
	return apiDelete(`${BASE}/${id}`);
}
