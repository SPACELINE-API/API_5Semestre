export type ProficiencyLevel =
	| 'basic'
	| 'intermediate'
	| 'advanced'
	| 'fluent'
	| 'native';

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

export type TranslatorLanguagePair = {
	id: string;
	language_pair_id: string;
	proficiency_level: ProficiencyLevel;
	// campos extras que chegam quando o backend expande o par
	source_language?: string;
	target_language?: string;
};

export type TranslatorQualification = {
	id: string;
	name: string;
	description: string | null;
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
	language_pairs: TranslatorLanguagePair[];
};

// ------ payloads de criacao/atualizacao ------

export type LanguagePairFormRow = {
	/** UUID do par no catalogo (language_pairs.id) */
	language_pair_id: string;
	/** Apenas exibicao no front — nao vai para a API */
	source_language: string;
	target_language: string;
	proficiency_level: ProficiencyLevel;
};

export type TranslatorCreateInput = {
	name: string;
	email: string;
	phone: string;
	qualification_ids: string[];
	language_pairs: {
		language_pair_id: string;
		proficiency_level: ProficiencyLevel;
	}[];
};

export const AVAILABLE_LANGUAGES = [
	{ code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
	{ code: 'en-US', label: 'Inglês (EUA)', flag: '🇺🇸' },
	{ code: 'es-ES', label: 'Espanhol (Espanha)', flag: '🇪🇸' },
	{ code: 'fr-FR', label: 'Francês (França)', flag: '🇫🇷' },
	{ code: 'de-DE', label: 'Alemão', flag: '🇩🇪' },
	{ code: 'it-IT', label: 'Italiano', flag: '🇮🇹' },
	{ code: 'zh-Hans', label: 'Chinês', flag: '🇨🇳' },
	{ code: 'ja-JP', label: 'Japonês', flag: '🇯🇵' },
];

export const KNOWN_LANGUAGE_PAIRS: Record<string, string> = {
	'pt-BR->en-US': 'b1b2b3b4-0000-4000-8000-000000000001',
	'en-US->pt-BR': 'b1b2b3b4-0000-4000-8000-000000000002',
	'pt-BR->es-ES': 'b1b2b3b4-0000-4000-8000-000000000003',
	'es-ES->pt-BR': 'b1b2b3b4-0000-4000-8000-000000000004',
	'pt-BR->fr-FR': 'b1b2b3b4-0000-4000-8000-000000000005',
	'pt-BR->de-DE': 'b1b2b3b4-0000-4000-8000-000000000006',
	'en-US->es-ES': 'b1b2b3b4-0000-4000-8000-000000000007',
	'pt-BR->ja-JP': 'b1b2b3b4-0000-4000-8000-000000000008',
};

export function resolveLanguagePairId(source: string, target: string): string {
	const key = `${source}->${target}`;
	return KNOWN_LANGUAGE_PAIRS[key] ?? 'b1b2b3b4-0000-4000-8000-000000000001';
}

export function getLanguageName(code: string): string {
	const lang = AVAILABLE_LANGUAGES.find((l) => l.code === code);
	if (!lang) return code;
	return lang.flag ? `${lang.flag} ${lang.label}` : lang.label;
}

export function formatLanguagePairDisplay(p: {
	language_pair_id?: string;
	source_language?: string | null;
	target_language?: string | null;
}): string {
	let source = p.source_language;
	let target = p.target_language;

	if ((!source || !target) && p.language_pair_id) {
		const match = Object.entries(KNOWN_LANGUAGE_PAIRS).find(
			([, id]) => id.toLowerCase() === p.language_pair_id?.toLowerCase()
		);
		if (match) {
			const [s, t] = match[0].split('->');
			source = s;
			target = t;
		}
	}

	if (source && target) {
		return `${getLanguageName(source)} → ${getLanguageName(target)}`;
	}

	if (p.language_pair_id) {
		return `${p.language_pair_id.slice(0, 8)}...`;
	}

	return '—';
}

export function formatLanguagePairCode(p: {
	language_pair_id?: string;
	source_language?: string | null;
	target_language?: string | null;
}): string {
	let source = p.source_language;
	let target = p.target_language;

	if ((!source || !target) && p.language_pair_id) {
		const match = Object.entries(KNOWN_LANGUAGE_PAIRS).find(
			([, id]) => id.toLowerCase() === p.language_pair_id?.toLowerCase()
		);
		if (match) {
			const [s, t] = match[0].split('->');
			source = s;
			target = t;
		}
	}

	if (source && target) {
		return `${source} → ${target}`;
	}

	if (p.language_pair_id) {
		return `${p.language_pair_id.slice(0, 8)}...`;
	}

	return '—';
}

export type TranslatorUpdateInput = TranslatorCreateInput;


