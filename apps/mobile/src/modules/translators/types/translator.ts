export type Qualification = {
	id: string;
	name: string;
	description: string | null;
};

export type LanguagePair = {
	id: string;
	language_pair_id: string;
	proficiency_level: string;
};

export type Translator = {
	id: string;
	name: string;
	email: string;
	phone: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	qualifications: Qualification[];
	language_pairs: LanguagePair[];
};

export type TranslatorPage = {
	items: Translator[];
	total: number;
	page: number;
	page_size: number;
};

export type TranslatorSearchParams = {
	language?: string;
	specialty?: string;
	status?: boolean;
	page?: number;
	page_size?: number;
};
