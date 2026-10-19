import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { FileDropzone } from '../../../shared/components/FileDropzone';
import type { NativeFile } from '../../../shared/types/file';
import {
	listCertifiableLanguages,
	submitCertificate,
} from '../services/certificateService';
import type {
	CertifiableLanguage,
	TranslatorCertificate,
} from '../types/certificate';
import {
	PROFICIENCY_OPTIONS,
	type ProficiencyLevel,
} from '../types/translator';
import {
	CERTIFICATE_FILE_RULES,
	formatFileSize,
	validateProfileFile,
} from '../utils/profileFiles';

type CertificateUploadModalProps = {
	visible: boolean;
	/** Idioma já escolhido ao abrir (ex.: substituir um certificado existente). */
	initialLanguageId?: string;
	onClose: () => void;
	onSubmitted: (certificate: TranslatorCertificate) => void;
};

type Step = 'form' | 'confirm-replace' | 'success' | 'error';

const FILE_HINT = `${CERTIFICATE_FILE_RULES.formatsLabel} · até ${formatFileSize(
	CERTIFICATE_FILE_RULES.maxBytes,
)}`;

function normalize(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();
}

export function CertificateUploadModal({
	visible,
	initialLanguageId,
	onClose,
	onSubmitted,
}: CertificateUploadModalProps) {
	const [step, setStep] = useState<Step>('form');
	const [message, setMessage] = useState('');
	const [languages, setLanguages] = useState<CertifiableLanguage[]>([]);
	const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
	const [languagesError, setLanguagesError] = useState<string | null>(null);
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [languageId, setLanguageId] = useState('');
	const [proficiency, setProficiency] = useState<ProficiencyLevel | null>(null);
	const [file, setFile] = useState<NativeFile | null>(null);
	const [pendingFile, setPendingFile] = useState<NativeFile | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const loadLanguages = useCallback(async () => {
		setIsLoadingLanguages(true);
		setLanguagesError(null);
		try {
			setLanguages(await listCertifiableLanguages());
		} catch {
			setLanguagesError('Não foi possível carregar os idiomas.');
		} finally {
			setIsLoadingLanguages(false);
		}
	}, []);

	useEffect(() => {
		if (!visible) return;
		setLanguageId(initialLanguageId ?? '');
		void loadLanguages();
	}, [visible, initialLanguageId, loadLanguages]);

	const selectedLanguage = languages.find((item) => item.id === languageId);
	const filteredLanguages = useMemo(() => {
		const query = normalize(search.trim());
		if (!query) return languages;
		return languages.filter((item) =>
			normalize(`${item.name} ${item.id}`).includes(query),
		);
	}, [languages, search]);

	function reset() {
		setStep('form');
		setMessage('');
		setIsPickerOpen(false);
		setSearch('');
		setLanguageId('');
		setProficiency(null);
		setFile(null);
		setPendingFile(null);
		setIsSubmitting(false);
	}

	function close() {
		reset();
		onClose();
	}

	function showError(reason: string) {
		setMessage(reason);
		setStep('error');
	}

	// SO UM ARQUIVO POR VEZ: SE JA EXISTE UM SELECIONADO, A TROCA EXIGE CONFIRMACAO
	function handleFileSelected(candidate: NativeFile) {
		const validationError = validateProfileFile(
			candidate,
			CERTIFICATE_FILE_RULES,
		);
		if (validationError) {
			showError(validationError);
			return;
		}

		if (file) {
			setPendingFile(candidate);
			setStep('confirm-replace');
			return;
		}
		setFile(candidate);
	}

	function confirmReplace() {
		setFile(pendingFile);
		setPendingFile(null);
		setStep('form');
	}

	function cancelReplace() {
		setPendingFile(null);
		setStep('form');
	}

	async function handleSubmit() {
		if (!languageId || !proficiency || !file) return;

		setIsSubmitting(true);
		try {
			const certificate = await submitCertificate({
				languageId,
				proficiencyLevel: proficiency,
				file,
			});
			onSubmitted(certificate);
			setMessage(
				`O certificado de ${certificate.language_name} foi enviado e ficará em análise até a avaliação do administrador.`,
			);
			setStep('success');
		} catch (cause) {
			showError(
				cause instanceof Error && cause.message
					? cause.message
					: 'Não foi possível enviar o certificado. Tente novamente.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (step === 'success') {
		return (
			<AppModal
				visible={visible}
				type="success"
				title="Certificado enviado"
				message={message}
				onClose={close}
			/>
		);
	}

	if (step === 'error') {
		return (
			<AppModal
				visible={visible}
				type="error"
				title="Não foi possível anexar o certificado"
				message={message}
				closeLabel="Voltar"
				onClose={() => setStep('form')}
			/>
		);
	}

	if (step === 'confirm-replace') {
		return (
			<AppModal
				visible={visible}
				type="confirmation"
				title="Substituir arquivo?"
				message={`O arquivo "${file?.name}" será substituído por "${pendingFile?.name}".`}
				confirmLabel="Substituir"
				onConfirm={confirmReplace}
				onClose={cancelReplace}
			/>
		);
	}

	const canSubmit = Boolean(languageId && proficiency && file);

	return (
		<AppModal
			visible={visible}
			size="md"
			title="Novo certificado"
			message="Envie o certificado que comprova o seu novo idioma de trabalho."
			confirmLabel="Enviar"
			confirmDisabled={!canSubmit}
			isLoading={isSubmitting}
			onConfirm={() => void handleSubmit()}
			onClose={close}
		>
			<View className="gap-1.5">
				<Text className="font-inter font-medium text-gray-700 text-[13px]">
					Idioma
				</Text>
				<TouchableOpacity
					onPress={() => setIsPickerOpen((open) => !open)}
					disabled={isSubmitting || isLoadingLanguages}
					accessibilityRole="button"
					accessibilityLabel="Selecionar idioma"
					accessibilityState={{ expanded: isPickerOpen }}
					className="h-12 flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-4"
				>
					<Text
						className={`flex-1 text-sm ${selectedLanguage ? 'text-gray-900' : 'text-gray-400'}`}
						numberOfLines={1}
					>
						{isLoadingLanguages
							? 'Carregando idiomas…'
							: (selectedLanguage?.name ?? 'Selecione um idioma')}
					</Text>
					{isLoadingLanguages ? (
						<ActivityIndicator size="small" color="#6B7280" />
					) : (
						<ChevronDown size={16} color="#6B7280" />
					)}
				</TouchableOpacity>

				{languagesError && (
					<View className="flex-row items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2">
						<Text className="flex-1 font-inter text-red-900 text-xs">
							{languagesError}
						</Text>
						<TouchableOpacity onPress={() => void loadLanguages()}>
							<Text className="font-inter font-semibold text-red-900 text-xs">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{!isLoadingLanguages && !languagesError && languages.length === 0 && (
					<Text className="font-inter text-gray-500 text-xs">
						Todos os idiomas cadastrados já fazem parte do seu perfil.
					</Text>
				)}

				{isPickerOpen && languages.length > 0 && (
					<View className="overflow-hidden rounded-lg border border-gray-200">
						<View className="flex-row items-center gap-2 border-b border-gray-200 px-3">
							<Search size={14} color="#9CA3AF" />
							<TextInput
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar idioma"
								placeholderTextColor="#9CA3AF"
								accessibilityLabel="Buscar idioma"
								className="h-10 flex-1 font-inter text-sm text-gray-900"
							/>
						</View>
						<ScrollView
							nestedScrollEnabled
							keyboardShouldPersistTaps="handled"
							style={{ maxHeight: 200 }}
						>
							{filteredLanguages.map((item) => (
								<TouchableOpacity
									key={item.id}
									onPress={() => {
										setLanguageId(item.id);
										setIsPickerOpen(false);
										setSearch('');
									}}
									accessibilityRole="button"
									className={`flex-row items-center justify-between px-4 py-2.5 ${
										item.id === languageId ? 'bg-blue-50' : ''
									}`}
								>
									<Text className="font-inter text-gray-800 text-sm">
										{item.name}
									</Text>
									{item.id === languageId && (
										<Check size={14} color="#1D4ED8" />
									)}
								</TouchableOpacity>
							))}
							{filteredLanguages.length === 0 && (
								<Text className="px-4 py-3 font-inter text-gray-400 text-sm">
									Nenhum idioma encontrado.
								</Text>
							)}
						</ScrollView>
					</View>
				)}
			</View>

			<View className="gap-1.5">
				<Text className="font-inter font-medium text-gray-700 text-[13px]">
					Proficiência
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{PROFICIENCY_OPTIONS.map((option) => {
						const isSelected = option.value === proficiency;
						return (
							<TouchableOpacity
								key={option.value}
								onPress={() => setProficiency(option.value)}
								disabled={isSubmitting}
								accessibilityRole="radio"
								accessibilityState={{ checked: isSelected }}
								className={`rounded-full border px-3 py-1.5 ${
									isSelected
										? 'border-blue-600 bg-blue-50'
										: 'border-gray-300 bg-white'
								}`}
							>
								<Text
									className={`font-inter text-xs ${
										isSelected ? 'font-semibold text-blue-800' : 'text-gray-700'
									}`}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>

			<View className="gap-1.5">
				<Text className="font-inter font-medium text-gray-700 text-[13px]">
					Certificado
				</Text>
				<FileDropzone
					file={file}
					accept={CERTIFICATE_FILE_RULES.mimeTypes}
					hint={FILE_HINT}
					selectedDetail={
						file?.size !== undefined ? formatFileSize(file.size) : undefined
					}
					disabled={isSubmitting}
					onFileSelected={handleFileSelected}
					onError={showError}
				/>
			</View>
		</AppModal>
	);
}
