import {
	apiDeleteAuth,
	apiGetAuth,
	apiPatchAuth,
	apiPostAuth,
	apiPutAuth,
} from '../../../shared/services/apiClient';
import { request } from '../../../shared/services/publicApiClient';
import type {
	Translator,
	TranslatorCreateInput,
	TranslatorUpdateInput,
	QualificationResponse,
	LanguageResponse,
} from '../types/translator';

const BASE = '/api/translators';

export function listQualifications(): Promise<QualificationResponse[]> {
	return apiGetAuth<QualificationResponse[]>(`${BASE}/metadata/qualifications`);
}

export function listLanguages(): Promise<LanguageResponse[]> {
	return apiGetAuth<LanguageResponse[]>('/api/support/languages');
}

export function listPublicLanguages(): Promise<LanguageResponse[]> {
	return request<LanguageResponse[]>('/api/support/languages');
}

export function createLanguage(
	id: string,
	name: string,
): Promise<LanguageResponse> {
	return apiPostAuth<LanguageResponse, { id: string; name: string }>(
		'/api/support/languages',
		{ id, name },
	);
}

export function listTranslators(): Promise<Translator[]> {
	return apiGetAuth<Translator[]>(BASE);
}

export function createTranslator(
	data: TranslatorCreateInput,
): Promise<Translator> {
	return apiPostAuth<Translator, TranslatorCreateInput>(BASE, data);
}

export function getTranslator(id: string): Promise<Translator> {
	return apiGetAuth<Translator>(`${BASE}/${id}`);
}

export function updateTranslator(
	id: string,
	data: TranslatorUpdateInput,
): Promise<Translator> {
	return apiPutAuth<Translator, TranslatorUpdateInput>(`${BASE}/${id}`, data);
}

export function setTranslatorActive(
	id: string,
	isActive: boolean,
): Promise<Translator> {
	return apiPatchAuth<Translator, { is_active: boolean }>(
		`${BASE}/${id}/status`,
		{
			is_active: isActive,
		},
	);
}

export function deleteTranslator(id: string): Promise<void> {
	return apiDeleteAuth(`${BASE}/${id}`);
}
