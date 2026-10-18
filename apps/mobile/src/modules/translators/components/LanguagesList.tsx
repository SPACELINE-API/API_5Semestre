import { Text, View } from 'react-native';
import { PROFICIENCY_LABELS } from '../types/translator';
import type { ProficiencyLevel } from '../types/translator';

type LanguagesListProps = {
	languages: {
		id: string;
		language_name: string;
		proficiency_level: ProficiencyLevel;
	}[];
};

export function LanguagesList({ languages }: LanguagesListProps) {
	if (languages.length === 0) {
		return (
			<Text className="font-inter text-gray-400 text-sm">
				Nenhum idioma cadastrado.
			</Text>
		);
	}

	return (
		<View className="gap-2">
			{languages.map((language) => (
				<View
					key={language.id}
					className="flex-row items-center justify-between gap-2 rounded-lg border border-gray-200 px-4 py-3"
				>
					<Text
						className="flex-1 font-inter font-medium text-gray-800 text-sm"
						numberOfLines={2}
					>
						{language.language_name}
					</Text>
					<View className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5">
						<Text className="font-inter font-medium text-blue-800 text-xs">
							{PROFICIENCY_LABELS[language.proficiency_level]}
						</Text>
					</View>
				</View>
			))}
		</View>
	);
}
