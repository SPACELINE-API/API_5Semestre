import type { TranslatorLanguage, TranslatorQualification } from './translator';

export type TranslatorProfile = {
	id: string;
	name: string;
	email: string;
	phone: string;
	is_active: boolean;
	photo_url: string | null;
	photo_filename: string | null;
	photo_size_bytes: number | null;
	qualifications: TranslatorQualification[];
	languages: TranslatorLanguage[];
};

export type TranslatorProfileUpdateInput = {
	name: string;
	phone: string;
};
