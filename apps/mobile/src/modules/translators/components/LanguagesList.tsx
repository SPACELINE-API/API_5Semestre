import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Languages } from 'lucide-react-native';
import { PROFICIENCY_LABELS } from '../types/translator';
import type { ProficiencyLevel } from '../types/translator';

type LanguagesListProps = {
	languages: {
		id: string;
		language_id?: string;
		language_name: string;
		proficiency_level: ProficiencyLevel;
	}[];
};

const LEVEL_ORDER: ProficiencyLevel[] = [
	'native',
	'fluent',
	'advanced',
	'intermediate',
	'basic',
];

const LEVEL_RANK: Record<ProficiencyLevel, number> = {
	basic: 1,
	intermediate: 2,
	advanced: 3,
	fluent: 4,
	native: 5,
};

const LEVEL_STYLES: Record<
	ProficiencyLevel,
	{ badgeBg: string; badgeText: string; bar: string }
> = {
	native: {
		badgeBg: 'bg-emerald-50',
		badgeText: 'text-emerald-800',
		bar: 'bg-emerald-500',
	},
	fluent: {
		badgeBg: 'bg-indigo-50',
		badgeText: 'text-indigo-800',
		bar: 'bg-indigo-500',
	},
	advanced: {
		badgeBg: 'bg-blue-50',
		badgeText: 'text-blue-800',
		bar: 'bg-blue-500',
	},
	intermediate: {
		badgeBg: 'bg-sky-50',
		badgeText: 'text-sky-800',
		bar: 'bg-sky-400',
	},
	basic: {
		badgeBg: 'bg-gray-100',
		badgeText: 'text-gray-700',
		bar: 'bg-gray-400',
	},
};

const SEGMENTS = [1, 2, 3, 4, 5];

function languageCode(language: LanguagesListProps['languages'][number]) {
	const source = language.language_id ?? language.language_name;
	return source.split('-')[0].slice(0, 3).toUpperCase();
}

export function LanguagesList({ languages }: LanguagesListProps) {
	const ordered = useMemo(
		() =>
			[...languages].sort(
				(a, b) =>
					LEVEL_RANK[b.proficiency_level] - LEVEL_RANK[a.proficiency_level] ||
					a.language_name.localeCompare(b.language_name, 'pt-BR'),
			),
		[languages],
	);

	const counts = useMemo(
		() =>
			LEVEL_ORDER.map((level) => ({
				level,
				total: languages.filter((item) => item.proficiency_level === level)
					.length,
			})).filter((item) => item.total > 0),
		[languages],
	);

	if (languages.length === 0) {
		return (
			<View className="items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-10">
				<View className="h-12 w-12 items-center justify-center rounded-full bg-gray-100">
					<Languages size={22} color="#9CA3AF" />
				</View>
				<Text className="text-center font-inter font-semibold text-gray-700 text-sm">
					Nenhum idioma cadastrado.
				</Text>
				<Text className="text-center font-inter text-gray-500 text-xs">
					Os idiomas de trabalho aparecem aqui depois de aprovados.
				</Text>
			</View>
		);
	}

	return (
		<View className="gap-5">
			<View className="gap-3">
				<Text className="font-inter font-semibold text-gray-900 text-sm">
					{languages.length === 1
						? '1 idioma de trabalho'
						: `${languages.length} idiomas de trabalho`}
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{counts.map(({ level, total }) => {
						const style = LEVEL_STYLES[level];
						return (
							<View
								key={level}
								className={`flex-row items-center gap-1.5 rounded-full px-3 py-1 ${style.badgeBg}`}
							>
								<Text
									className={`font-inter font-semibold text-xs ${style.badgeText}`}
								>
									{total}
								</Text>
								<Text className={`font-inter text-xs ${style.badgeText}`}>
									{PROFICIENCY_LABELS[level]}
								</Text>
							</View>
						);
					})}
				</View>
			</View>

			<View className="flex-row flex-wrap gap-3">
				{ordered.map((language) => {
					const style = LEVEL_STYLES[language.proficiency_level];
					const rank = LEVEL_RANK[language.proficiency_level];

					return (
						<View
							key={language.id}
							className="min-w-[240px] flex-1 basis-[280px] gap-3 rounded-xl border border-gray-200 bg-white p-4"
						>
							<View className="flex-row items-center gap-3">
								<View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
									<Text className="font-inter font-bold text-blue-700 text-xs">
										{languageCode(language)}
									</Text>
								</View>
								<Text
									className="min-w-0 flex-1 font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={2}
								>
									{language.language_name}
								</Text>
							</View>

							<View className="gap-1.5">
								<View className="flex-row items-center justify-between gap-2">
									<Text className="font-inter text-gray-400 text-xs">
										Fluência
									</Text>
									<View
										className={`rounded-full px-2.5 py-0.5 ${style.badgeBg}`}
									>
										<Text
											className={`font-inter font-medium text-xs ${style.badgeText}`}
										>
											{PROFICIENCY_LABELS[language.proficiency_level]}
										</Text>
									</View>
								</View>
								<View className="flex-row gap-1">
									{SEGMENTS.map((segment) => (
										<View
											key={segment}
											className={`h-1.5 flex-1 rounded-full ${
												segment <= rank ? style.bar : 'bg-gray-100'
											}`}
										/>
									))}
								</View>
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
}
