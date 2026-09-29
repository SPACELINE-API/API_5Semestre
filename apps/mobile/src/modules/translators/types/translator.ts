export type ProficiencyLevel =
	'basic' | 'intermediate' | 'advanced' | 'fluent' | 'native';

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
	basic: 'Básico',
	intermediate: 'Intermediário',
	advanced: 'Avançado',
	fluent: 'Fluente',
	native: 'Nativo',
};

export const PROFICIENCY_OPTIONS: { value: ProficiencyLevel; label: string }[] =
	[
		{ value: 'basic', label: 'Básico' },
		{ value: 'intermediate', label: 'Intermediário' },
		{ value: 'advanced', label: 'Avançado' },
		{ value: 'fluent', label: 'Fluente' },
		{ value: 'native', label: 'Nativo' },
	];

export type LanguageResponse = { id: string; name: string };

export type TranslatorLanguage = {
	id: string;
	language_id: string;
	language_name: string;
	proficiency_level: ProficiencyLevel;
};

export type TranslatorQualification = {
	id: string;
	name: string;
	description: string | null;
};

export type QualificationResponse = {
	id: string;
	name: string;
	description?: string;
};

export type Translator = {
	id: string;
	name: string;
	email: string;
	phone: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	qualifications: TranslatorQualification[];
	languages: TranslatorLanguage[];
};

export type TranslatorLanguageFormRow = {
	language_id: string;
	proficiency_level: ProficiencyLevel;
};

export type TranslatorCreateInput = {
	name: string;
	email: string;
	phone: string;
	qualification_ids: string[];
	languages: TranslatorLanguageFormRow[];
};

export type TranslatorUpdateInput = TranslatorCreateInput;
