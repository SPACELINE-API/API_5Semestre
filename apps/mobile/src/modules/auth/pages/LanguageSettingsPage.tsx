import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Languages, Plus, Trash2 } from 'lucide-react-native';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { SettingsHeader } from '../components/SettingsHeader';
import { usePermission } from '../hooks/usePermission';
import {
	createLanguage,
	deleteLanguage,
	listManageLanguages,
} from '../../translators/services/translatorService';
import type { LanguageResponse } from '../../translators/types/translator';

function sortLanguages(languages: LanguageResponse[]) {
	return [...languages].sort((first, second) =>
		first.name.localeCompare(second.name, 'pt-BR'),
	);
}

function languageError(error: unknown) {
	const message = error instanceof Error ? error.message : '';
	if (message.toLowerCase().includes('already exists')) {
		return 'Este código de idioma já está cadastrado.';
	}
	return message || 'Não foi possível concluir a operação. Tente novamente.';
}

export default function LanguageSettingsPage() {
	const { toast, showToast } = useToast();
	const canEdit = usePermission('languages.write');
	const [languages, setLanguages] = useState<LanguageResponse[]>([]);
	const [name, setName] = useState('');
	const [code, setCode] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [languageToDelete, setLanguageToDelete] =
		useState<LanguageResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [fieldError, setFieldError] = useState<string | null>(null);

	const loadLanguages = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			setLanguages(sortLanguages(await listManageLanguages()));
		} catch (loadError) {
			setError(languageError(loadError));
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadLanguages();
	}, [loadLanguages]);

	async function handleCreate() {
		const trimmedName = name.trim();
		const trimmedCode = code.trim();
		if (!trimmedName || !trimmedCode) {
			setFieldError('Informe o nome e o código do idioma.');
			return;
		}
		if (
			languages.some(
				(language) =>
					language.id.toLocaleLowerCase() === trimmedCode.toLocaleLowerCase(),
			)
		) {
			setFieldError('Este código de idioma já está cadastrado.');
			return;
		}

		setIsSaving(true);
		setFieldError(null);
		try {
			const created = await createLanguage(trimmedCode, trimmedName);
			setLanguages((current) => sortLanguages([...current, created]));
			setName('');
			setCode('');
			showToast('Idioma cadastrado com sucesso.', 'success');
		} catch (createError) {
			setFieldError(languageError(createError));
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete() {
		if (!languageToDelete) return;

		setIsDeleting(true);
		try {
			await deleteLanguage(languageToDelete.id);
			setLanguages((current) =>
				current.filter((language) => language.id !== languageToDelete.id),
			);
			showToast('Idioma removido com sucesso.', 'success');
			setLanguageToDelete(null);
		} catch (deleteError) {
			showToast(languageError(deleteError), 'error');
			setLanguageToDelete(null);
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<SettingsHeader active="idiomas" />
				<View className="gap-6">
					<View className="rounded-xl border border-gray-200 p-5 md:p-6">
						<View className="mb-5 flex-row items-center gap-3">
							<View className="rounded-lg bg-blue-50 p-2.5">
								<Languages size={20} color="#2563eb" />
							</View>
							<View className="flex-1">
								<Text className="font-inter font-semibold text-gray-900 text-base">
									Cadastrar idioma
								</Text>
								<Text className="mt-1 font-inter text-gray-500 text-sm">
									Adicione idiomas que poderão ser usados pela plataforma.
								</Text>
							</View>
						</View>
						<View className="flex-col gap-4 md:flex-row">
							<View className="flex-1 gap-1.5">
								<Text className="font-inter font-medium text-gray-700 text-sm">
									Nome
								</Text>
								<TextInput
									value={name}
									onChangeText={(value) => {
										setName(value);
										setFieldError(null);
									}}
									placeholder="Ex.: Hindi"
									maxLength={100}
									accessibilityLabel="Nome do idioma"
									className="rounded-md border border-gray-300 px-3 py-2.5 font-inter text-gray-900 text-sm"
								/>
							</View>
							<View className="flex-1 gap-1.5">
								<Text className="font-inter font-medium text-gray-700 text-sm">
									Código identificador
								</Text>
								<TextInput
									value={code}
									onChangeText={(value) => {
										setCode(value);
										setFieldError(null);
									}}
									placeholder="Ex.: hi-IN"
									maxLength={20}
									autoCapitalize="none"
									accessibilityLabel="Código identificador do idioma"
									className="rounded-md border border-gray-300 px-3 py-2.5 font-inter text-gray-900 text-sm"
								/>
							</View>
						</View>
						{fieldError && (
							<Text
								accessibilityRole="alert"
								className="mt-3 font-inter text-red-700 text-sm"
							>
								{fieldError}
							</Text>
						)}
						{canEdit && <TouchableOpacity
							onPress={() => void handleCreate()}
							disabled={isSaving}
							accessibilityRole="button"
							className={`mt-5 flex-row items-center justify-center gap-2 self-start rounded-lg px-4 py-2.5 ${isSaving ? 'bg-blue-300' : 'bg-blue-600'}`}
						>
							{isSaving ? (
								<ActivityIndicator size="small" color="#ffffff" />
							) : (
								<Plus size={17} color="#ffffff" />
							)}
							<Text className="font-inter font-semibold text-sm text-white">
								{isSaving ? 'Salvando...' : 'Cadastrar idioma'}
							</Text>
						</TouchableOpacity>}
					</View>

					<View className="rounded-xl border border-gray-200 p-5 md:p-6">
						<View className="mb-4 flex-row items-center justify-between gap-3">
							<View>
								<Text className="font-inter font-semibold text-gray-900 text-base">
									Idiomas cadastrados
								</Text>
								<Text className="mt-1 font-inter text-gray-500 text-sm">
									{languages.length}{' '}
									{languages.length === 1 ? 'idioma' : 'idiomas'}
								</Text>
							</View>
						</View>
						{isLoading ? (
							<View className="items-center gap-3 py-10">
								<ActivityIndicator color="#2563eb" />
								<Text className="font-inter text-gray-500 text-sm">
									Carregando idiomas...
								</Text>
							</View>
						) : error ? (
							<View className="items-center gap-3 py-8">
								<Text
									accessibilityRole="alert"
									className="text-center font-inter text-red-700 text-sm"
								>
									{error}
								</Text>
								<TouchableOpacity onPress={() => void loadLanguages()}>
									<Text className="font-inter font-semibold text-blue-600 text-sm">
										Tentar novamente
									</Text>
								</TouchableOpacity>
							</View>
						) : languages.length === 0 ? (
							<Text className="py-8 text-center font-inter text-gray-500 text-sm">
								Nenhum idioma cadastrado.
							</Text>
						) : (
							<View className="border-t border-gray-100">
								{languages.map((language) => (
									<View
										key={language.id}
										className="flex-row items-center justify-between gap-4 border-b border-gray-100 py-3.5"
									>
										<Text className="flex-1 font-inter font-medium text-gray-800 text-sm">
											{language.name}
										</Text>
										<View className="flex-row items-center gap-3">
											<Text className="rounded-md bg-gray-50 px-2.5 py-1 font-inter text-gray-500 text-xs">
												{language.id}
											</Text>
											{canEdit && <TouchableOpacity
												onPress={() => setLanguageToDelete(language)}
												accessibilityRole="button"
												accessibilityLabel={`Remover idioma ${language.name}`}
												className="rounded-md p-2"
											>
												<Trash2 size={17} color="#b91c1c" />
											</TouchableOpacity>}
										</View>
									</View>
								))}
							</View>
						)}
					</View>
				</View>
			</ScrollView>
			<ConfirmDialog
				visible={languageToDelete !== null}
				title="Remover idioma"
				message={
					languageToDelete
						? `O idioma ${languageToDelete.name} será removido do catálogo. Idiomas vinculados a tradutores ou certificados não podem ser removidos.`
						: ''
				}
				confirmLabel="Remover"
				destructive
				isLoading={isDeleting}
				onConfirm={() => void handleDelete()}
				onCancel={() => setLanguageToDelete(null)}
			/>
			<Toast toast={toast} />
		</View>
	);
}
