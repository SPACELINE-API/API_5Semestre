import { useMemo, useState } from 'react';
import { SearchTextInput } from '../../../shared/components/SearchTextInput';
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
import {
	Check,
	ChevronDown,
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react-native';
import {
	PROFICIENCY_OPTIONS,
	type LanguageResponse,
	type TranslatorLanguageFormRow,
} from '../types/translator';
import { getLanguageFlag } from '../utils/languageFlag';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
function normalizeSearch(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();
}

type Props = {
	languages: TranslatorLanguageFormRow[];
	availableLanguages: LanguageResponse[];
	error?: string;
	onAddLanguage: () => void;
	onRemoveLanguage: (index: number) => void;
	onUpdateLanguage: (
		index: number,
		field: keyof TranslatorLanguageFormRow,
		value: string,
	) => void;
	onCreateLanguage: (
		id: string,
		name: string,
	) => Promise<LanguageResponse | null>;
	createLanguageError?: string;
	onClearCreateLanguageError: () => void;
};

export function TranslatorLanguagesStep({
	languages,
	availableLanguages,
	error,
	onAddLanguage,
	onRemoveLanguage,
	onUpdateLanguage,
	onCreateLanguage,
	createLanguageError,
	onClearCreateLanguageError,
}: Props) {
	const themeColors = useThemeColors();
	const { width } = useWindowDimensions();
	const [langPicker, setLangPicker] = useState<number | null>(null);
	const [createLanguageVisible, setCreateLanguageVisible] = useState(false);
	const [createTargetIndex, setCreateTargetIndex] = useState<number | null>(
		null,
	);
	const [newLanguageId, setNewLanguageId] = useState('');
	const [newLanguageName, setNewLanguageName] = useState('');
	const [creatingLanguage, setCreatingLanguage] = useState(false);
	const canWriteSettings = usePermission('languages.write');
	const [languageSearch, setLanguageSearch] = useState('');
	const filteredLanguages = useMemo(() => {
		const query = normalizeSearch(languageSearch.trim());
		if (!query) return availableLanguages;

		return availableLanguages.filter((language) =>
			normalizeSearch(`${language.name} ${language.id}`).includes(query),
		);
	}, [availableLanguages, languageSearch]);
	const closeLanguagePicker = () => {
		setLangPicker(null);
		setLanguageSearch('');
	};
	const openCreateLanguage = () => {
		setCreateTargetIndex(
			langPicker ?? languages.findIndex((item) => !item.language_id),
		);
		setNewLanguageId('');
		setNewLanguageName('');
		onClearCreateLanguageError();
		closeLanguagePicker();
		setCreateLanguageVisible(true);
	};
	const saveNewLanguage = async () => {
		setCreatingLanguage(true);
		const created = await onCreateLanguage(newLanguageId, newLanguageName);
		setCreatingLanguage(false);
		if (!created) return;
		const targetIndex = createTargetIndex ?? -1;
		if (targetIndex >= 0)
			onUpdateLanguage(targetIndex, 'language_id', created.id);
		setCreateLanguageVisible(false);
		closeLanguagePicker();
	};

	return (
		<>
			<Text className="font-inter text-foreground-secondary text-[14px]">
				Adicione os idiomas que o tradutor fala e informe o nível em cada um.
			</Text>
			{error && (
				<View className="rounded-lg bg-danger-soft px-3 py-2.5 mb-2">
					<Text className="font-inter text-danger-text text-sm">{error}</Text>
				</View>
			)}
			{languages.map((language, index) => {
				const selectedLanguage = availableLanguages.find(
					(option) => option.id === language.language_id,
				);
				return (
					<View
						key={index}
						className="gap-3 rounded-xl border border-border p-4 mb-2"
					>
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-foreground text-sm">
								Idioma #{index + 1}
							</Text>
							{languages.length > 1 && (
								<TouchableOpacity
									onPress={() => onRemoveLanguage(index)}
									accessibilityLabel={`Remover idioma ${index + 1}`}
								>
									<Trash2 size={16} color={themeColors.foregroundSecondary} />
								</TouchableOpacity>
							)}
						</View>

						<View className="gap-1">
							<Text className="font-inter font-medium text-foreground-secondary text-[14px]">
								Idioma
							</Text>
							<TouchableOpacity
								onPress={() => {
									setLanguageSearch('');
									setLangPicker(index);
								}}
								className="h-12 flex-row items-center justify-between rounded-lg border border-border-strong bg-surface px-4"
								accessibilityRole="button"
								accessibilityLabel="Selecionar idioma"
							>
								{selectedLanguage ? (
									<View className="flex-row items-center gap-2">
										<Text className="text-base text-foreground-secondary">
											{getLanguageFlag(selectedLanguage)}
										</Text>
										<Text className="text-sm text-foreground">
											{selectedLanguage.name}
										</Text>
									</View>
								) : (
									<Text className="text-sm text-foreground-subtle">
										Selecione um idioma
									</Text>
								)}
								<ChevronDown size={16} color={themeColors.foregroundMuted} />
							</TouchableOpacity>
						</View>

						<View className="gap-1.5">
							<Text className="font-inter font-medium text-foreground-secondary text-[14px]">
								Nível de proficiência
							</Text>
							<View className="flex-row flex-wrap gap-2">
								{PROFICIENCY_OPTIONS.map((option) => {
									const selected = language.proficiency_level === option.value;
									return (
										<TouchableOpacity
											key={option.value}
											onPress={() =>
												onUpdateLanguage(
													index,
													'proficiency_level',
													option.value,
												)
											}
											activeOpacity={0.7}
											className={`rounded-lg border px-3 py-2 ${selected ? 'border-primary/40 bg-primary-soft' : 'border-border-strong bg-surface'}`}
										>
											<Text
												className={`font-inter text-xs ${selected ? 'font-semibold text-primary-strong' : 'text-foreground-secondary'}`}
											>
												{option.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					</View>
				);
			})}

			<TouchableOpacity
				onPress={onAddLanguage}
				activeOpacity={0.7}
				className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-subtle py-3"
			>
				<Plus size={16} color={themeColors.foregroundSecondary} />
				<Text className="font-inter font-medium text-foreground-secondary text-sm">
					Adicionar idioma
				</Text>
			</TouchableOpacity>

			{langPicker !== null && (
				<Modal
					visible
					transparent
					animationType="fade"
					onRequestClose={closeLanguagePicker}
				>
					<View className="flex-1 justify-center items-center px-4">
						<Pressable
							className="absolute inset-0 bg-overlay/40"
							onPress={closeLanguagePicker}
							accessibilityLabel="Fechar seleção de idioma"
						/>
						<View className="w-full max-w-[400px] max-h-[80%] overflow-hidden rounded-xl bg-surface pb-4">
							<View className="flex-row items-center justify-between p-4 border-b border-border-strong">
								<Text className="font-inter font-bold text-foreground text-lg">
									Selecione o idioma
								</Text>
								<TouchableOpacity
									onPress={closeLanguagePicker}
									accessibilityLabel="Fechar seleção de idioma"
								>
									<X size={20} color={themeColors.foregroundSecondary} />
								</TouchableOpacity>
							</View>
							<View className="mx-4 mt-4 flex-row items-center gap-2 rounded-lg border border-border-strong bg-surface px-3">
								<Search size={17} color={themeColors.foregroundSubtle} />
								<SearchTextInput
									value={languageSearch}
									onChangeText={setLanguageSearch}
									placeholder={
										width < 768
											? 'Buscar idioma ou código'
											: 'Buscar por idioma ou código'
									}
									numberOfLines={1}
									placeholderTextColor={themeColors.foregroundSubtle}
									autoCapitalize="none"
									autoCorrect={false}
									accessibilityLabel="Buscar idioma"
									className="h-11 flex-1 text-sm text-foreground outline-none max-md:min-w-0 max-md:shrink max-md:leading-5"
								/>
							</View>
							<ScrollView className="px-4" keyboardShouldPersistTaps="handled">
								{filteredLanguages.map((option) => {
									const selected =
										option.id === languages[langPicker].language_id;
									return (
										<TouchableOpacity
											key={option.id}
											onPress={() => {
												onUpdateLanguage(langPicker, 'language_id', option.id);
												closeLanguagePicker();
											}}
											className="flex-row items-center gap-3 border-b border-border-subtle px-2 py-3"
										>
											<Text className="text-lg text-foreground-secondary">
												{getLanguageFlag(option)}
											</Text>
											<Text className="flex-1 font-inter font-medium text-foreground text-sm">
												{option.name}
											</Text>
											{selected && (
												<Check size={16} color={themeColors.primary} />
											)}
										</TouchableOpacity>
									);
								})}
								{filteredLanguages.length === 0 && (
									<Text className="px-2 py-6 text-center text-sm text-foreground-muted">
										Nenhum idioma encontrado.
									</Text>
								)}
								<TouchableOpacity
									className={`flex-row items-center justify-center border-t border-border bg-surface-subtle px-3 py-3 ${!canWriteSettings ? 'opacity-40' : ''}`}
									onPress={openCreateLanguage}
									disabled={!canWriteSettings}
								>
									<Plus size={16} color={themeColors.primary} />
									<Text className="ml-2 font-inter font-medium text-primary-strong text-sm">
										Adicionar outro idioma
									</Text>
								</TouchableOpacity>
							</ScrollView>
						</View>
					</View>
				</Modal>
			)}
			<Modal
				visible={createLanguageVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setCreateLanguageVisible(false)}
			>
				<View className="flex-1 items-center justify-center bg-overlay/40 px-4">
					<View className="w-full max-w-[400px] rounded-xl bg-surface p-6">
						<Text className="mb-4 font-inter font-bold text-foreground text-lg">
							Adicionar idioma
						</Text>
						<Text className="mb-1.5 font-inter font-medium text-foreground-secondary text-xs">
							Sigla
						</Text>
						<TextInput
							className="mb-4 rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
							placeholder="pt-BR"
							placeholderTextColor={themeColors.foregroundSubtle}
							value={newLanguageId}
							onChangeText={(value) => {
								setNewLanguageId(value);
								onClearCreateLanguageError();
							}}
							autoCapitalize="none"
						/>
						<Text className="mb-1.5 font-inter font-medium text-foreground-secondary text-xs">
							Idioma
						</Text>
						<TextInput
							className="mb-4 rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
							placeholder="Português"
							placeholderTextColor={themeColors.foregroundSubtle}
							value={newLanguageName}
							onChangeText={(value) => {
								setNewLanguageName(value);
								onClearCreateLanguageError();
							}}
						/>
						{createLanguageError ? (
							<Text className="mb-3 text-sm text-danger">
								{createLanguageError}
							</Text>
						) : null}
						<View className="flex-row justify-end gap-3">
							<TouchableOpacity
								className="flex-1 items-center rounded-lg border border-primary/30 px-4 py-2"
								onPress={() => setCreateLanguageVisible(false)}
								disabled={creatingLanguage}
							>
								<Text className="font-inter-medium text-sm text-primary-text">
									Cancelar
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								className="flex-1 items-center rounded-lg bg-primary px-4 py-2"
								onPress={saveNewLanguage}
								disabled={creatingLanguage}
							>
								<Text className="font-inter-medium text-sm text-primary-foreground">
									{creatingLanguage ? 'Salvando...' : 'Salvar'}
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</>
	);
}
