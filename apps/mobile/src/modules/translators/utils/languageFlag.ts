import type { LanguageResponse } from '../types/translator';

const LANGUAGE_COUNTRY_OVERRIDES: Record<string, string> = {
	ca: 'ES',
	ha: 'HT',
	ms: 'MY',
	mn: 'MN',
	so: 'SO',
	th: 'TH',
	vi: 'VN',
	umb: 'AO',
	'zh-Hans': 'CN',
	'zh-Hant': 'TW',
	'es-LA': '🌎',
};

function flagFromCountryCode(countryCode: string) {
	return [...countryCode.toUpperCase()]
		.map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
		.join('');
}

export function getLanguageFlag(language: LanguageResponse) {
	const override = LANGUAGE_COUNTRY_OVERRIDES[language.id];
	if (override?.startsWith('🌎')) return override;

	const countryCode =
		override ??
		(language.id.includes('-') ? language.id.split('-').at(-1) : undefined);
	if (countryCode && /^[A-Z]{2}$/i.test(countryCode)) {
		return flagFromCountryCode(countryCode);
	}

	return '🌐';
}
