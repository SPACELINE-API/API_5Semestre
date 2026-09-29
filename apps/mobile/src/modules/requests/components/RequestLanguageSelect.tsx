import { useMemo, useState } from 'react';
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import type { LanguageResponse } from '../../translators/types/translator';
import { getLanguageFlag } from '../../translators/utils/languageFlag';

function normalizeSearch(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();
}

type Props = {
	label: string;
	value: string;
	languages: LanguageResponse[];
	loading?: boolean;
	onChange: (languageId: string) => void;
};

export function RequestLanguageSelect({
	label,
	value,
	languages,
	loading = false,
	onChange,
}: Props) {
	const { width } = useWindowDimensions();
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const selectedLanguage = languages.find((language) => language.id === value);
	const filteredLanguages = useMemo(() => {
		const query = normalizeSearch(search.trim());
		if (!query) return languages;

		return languages.filter((language) =>
			normalizeSearch(`${language.name} ${language.id}`).includes(query),
		);
	}, [languages, search]);

	function closePicker() {
		setIsOpen(false);
		setSearch('');
	}

	return (
		<View className="w-full gap-1">
			<Text className="mb-1 text-sm font-bold text-[#101b35]">
				{label}
				<Text className="text-red-500">*</Text>
			</Text>
			<TouchableOpacity
				accessibilityRole="button"
				accessibilityLabel={`${label}: ${
					selectedLanguage?.name ?? 'selecione um idioma'
				}`}
				disabled={loading || languages.length === 0}
				onPress={() => setIsOpen(true)}
				className="h-11 w-full flex-row items-center justify-between rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4"
			>
				{selectedLanguage ? (
					<View className="flex-row items-center gap-2">
						<Text className="text-base">
							{getLanguageFlag(selectedLanguage)}
						</Text>
						<Text className="text-sm text-[#12233c]">
							{selectedLanguage.name}
						</Text>
					</View>
				) : (
					<Text className="text-sm text-[#94a3b8]">
						{loading ? 'Carregando idiomas...' : 'Selecione um idioma'}
					</Text>
				)}
				<ChevronDown size={16} color="#64748b" />
			</TouchableOpacity>

			<Modal
				visible={isOpen}
				transparent
				animationType="fade"
				onRequestClose={closePicker}
			>
				<View className="flex-1 items-center justify-center px-4">
					<Pressable
						className="absolute inset-0 bg-black/40"
						onPress={closePicker}
						accessibilityLabel="Fechar seleção de idioma"
					/>
					<View className="max-h-[80%] w-full max-w-[400px] overflow-hidden rounded-xl bg-white pb-4">
						<View className="flex-row items-center justify-between border-b border-gray-300 p-4">
							<Text className="font-inter font-bold text-lg text-gray-900">
								Selecione o idioma
							</Text>
							<TouchableOpacity
								accessibilityLabel="Fechar seleção de idioma"
								onPress={closePicker}
							>
								<X size={20} color="#5A5A5A" />
							</TouchableOpacity>
						</View>
						<View className="mx-4 mt-4 flex-row items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
							<Search size={17} color="#9CA3AF" />
							<TextInput
								value={search}
								onChangeText={setSearch}
								placeholder={
									width < 768
										? 'Buscar idioma ou código'
										: 'Buscar por idioma ou código'
								}
								placeholderTextColor="#9CA3AF"
								autoCapitalize="none"
								autoCorrect={false}
								accessibilityLabel="Buscar idioma"
								className="h-11 flex-1 text-sm text-gray-900 max-md:min-w-0 max-md:shrink max-md:leading-5"
							/>
						</View>
						<ScrollView className="px-4" keyboardShouldPersistTaps="handled">
							{filteredLanguages.map((language) => {
								const selected = language.id === value;
								return (
									<TouchableOpacity
										key={language.id}
										accessibilityRole="button"
										onPress={() => {
											onChange(language.id);
											closePicker();
										}}
										className="flex-row items-center gap-3 border-b border-gray-100 px-2 py-3"
									>
										<Text className="text-lg">{getLanguageFlag(language)}</Text>
										<Text className="flex-1 font-inter font-medium text-sm text-gray-800">
											{language.name}
										</Text>
										{selected && <Check size={16} color="#1C6FB0" />}
									</TouchableOpacity>
								);
							})}
							{filteredLanguages.length === 0 && (
								<Text className="px-2 py-6 text-center text-sm text-gray-500">
									Nenhum idioma encontrado.
								</Text>
							)}
						</ScrollView>
					</View>
				</View>
			</Modal>
		</View>
	);
}
