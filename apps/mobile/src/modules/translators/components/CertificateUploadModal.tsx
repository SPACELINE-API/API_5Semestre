import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Platform,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, ChevronDown, CircleAlert, Search } from 'lucide-react-native';
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

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type CertificateUploadModalProps = {
	visible: boolean;
	/** Certificado em análise ou recusado cujo arquivo será substituído. */
	certificateToReplace?: TranslatorCertificate | null;
	onClose: () => void;
	onSubmitted?: (certificate: TranslatorCertificate) => void;
};

const PICKER_RETURN_DELAY_MS = 600;

type Step = 'form' | 'confirm-replace' | 'success' | 'error';

const MEGABYTE = 1024 * 1024;
const FILE_HINT = `${CERTIFICATE_FILE_RULES.formatsLabel} · até ${
	CERTIFICATE_FILE_RULES.maxBytes / MEGABYTE
} MB`;

// MONTA O AVISO COM O QUE AINDA FALTA PARA LIBERAR O ENVIO
function missingFieldsMessage(missing: string[]): string | null {
	if (missing.length === 0) return null;
	const items =
		missing.length === 1
			? missing[0]
			: `${missing.slice(0, -1).join(', ')} e ${missing[missing.length - 1]}`;
	return `Selecione ${items} para enviar.`;
}

function normalize(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();
}

export function CertificateUploadModal({
	visible,
	certificateToReplace,
	onClose,
	onSubmitted,
}: CertificateUploadModalProps) {
	const themeColors = useThemeColors();
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
		setLanguageId(certificateToReplace?.language_id ?? '');
		setProficiency(certificateToReplace?.proficiency_level ?? null);
		void loadLanguages();
	}, [visible, certificateToReplace, loadLanguages]);

	const isReplacing = Boolean(certificateToReplace);

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

	function afterPicker(action: () => void) {
		if (Platform.OS === 'web') {
			action();
			return;
		}
		setTimeout(action, PICKER_RETURN_DELAY_MS);
	}

	// SO UM ARQUIVO POR VEZ: UM NOVO ARQUIVO VALIDO SUBSTITUI O SELECIONADO NA HORA
	function handleFileSelected(candidate: NativeFile) {
		const validationError = validateProfileFile(
			candidate,
			CERTIFICATE_FILE_RULES,
		);
		if (validationError) {
			afterPicker(() => showError(validationError));
			return;
		}

		// NA SUBSTITUICAO DE UM CERTIFICADO JA ENVIADO, A TROCA DO ARQUIVO PRECISA SER CONFIRMADA
		if (isReplacing) {
			setPendingFile(candidate);
			afterPicker(() => setStep('confirm-replace'));
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
			onSubmitted?.(certificate);
			setMessage(
				`${isReplacing ? 'O novo arquivo do certificado' : 'O certificado'} de ${certificate.language_name} foi enviado e ficará em análise até a avaliação do administrador.`,
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
				key="success"
				visible={visible}
				type="success"
				title="Certificado enviado"
				message={message}
				onClose={close}
			/>
		);
	}

	if (step === 'confirm-replace') {
		return (
			<AppModal
				key="confirm-replace"
				visible={visible}
				type="confirmation"
				title="Substituir certificado?"
				message={`O certificado atual "${certificateToReplace?.filename}" será substituído por "${pendingFile?.name}".`}
				confirmLabel="Substituir"
				onConfirm={confirmReplace}
				onClose={cancelReplace}
			/>
		);
	}

	if (step === 'error') {
		return (
			<AppModal
				key="error"
				visible={visible}
				type="error"
				title="Não foi possível anexar o certificado"
				message={message}
				closeLabel="Voltar"
				onClose={() => setStep('form')}
			/>
		);
	}

	const canSubmit = Boolean(languageId && proficiency && file);
	const missingMessage = missingFieldsMessage(
		[
			!languageId && 'o idioma',
			!proficiency && 'a proficiência',
			!file && 'o arquivo do certificado',
		].filter((item): item is string => Boolean(item)),
	);

	return (
		<AppModal
			key="form"
			visible={visible}
			size="md"
			title={isReplacing ? 'Substituir certificado' : 'Novo certificado'}
			message={
				isReplacing
					? `O novo arquivo substituirá o certificado atual de ${certificateToReplace?.language_name} e voltará para análise.`
					: 'Envie o certificado que comprova o seu novo idioma de trabalho.'
			}
			confirmLabel="Enviar"
			confirmDisabled={!canSubmit}
			isLoading={isSubmitting}
			onConfirm={() => void handleSubmit()}
			onClose={close}
		>
			<View className="gap-1.5">
				<Text className="font-inter font-medium text-foreground-secondary text-[13px]">
					Idioma
				</Text>
				<TouchableOpacity
					onPress={() => setIsPickerOpen((open) => !open)}
					disabled={isSubmitting || isLoadingLanguages || isReplacing}
					accessibilityRole="button"
					accessibilityLabel="Selecionar idioma"
					accessibilityState={{ expanded: isPickerOpen }}
					className="h-12 flex-row items-center justify-between rounded-lg border border-border-strong bg-surface px-4"
				>
					<Text
						className={`flex-1 text-sm ${selectedLanguage ? 'text-foreground' : 'text-foreground-subtle'}`}
						numberOfLines={1}
					>
						{isLoadingLanguages
							? 'Carregando idiomas…'
							: (selectedLanguage?.name ??
								certificateToReplace?.language_name ??
								'Selecione um idioma')}
					</Text>
					{isLoadingLanguages ? (
						<ActivityIndicator
							size="small"
							color={themeColors.foregroundMuted}
						/>
					) : isReplacing ? null : (
						<ChevronDown size={16} color={themeColors.foregroundMuted} />
					)}
				</TouchableOpacity>

				{languagesError && (
					<View className="flex-row items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2">
						<Text className="flex-1 font-inter text-danger-text text-xs">
							{languagesError}
						</Text>
						<TouchableOpacity onPress={() => void loadLanguages()}>
							<Text className="font-inter font-semibold text-danger-text text-xs">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{!isLoadingLanguages && !languagesError && languages.length === 0 && (
					<Text className="font-inter text-foreground-muted text-xs">
						Todos os idiomas cadastrados já fazem parte do seu perfil.
					</Text>
				)}

				{isPickerOpen && languages.length > 0 && (
					<View className="overflow-hidden rounded-lg border border-border">
						<View className="flex-row items-center gap-2 border-b border-border px-3">
							<Search size={14} color={themeColors.foregroundSubtle} />
							<TextInput
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar idioma"
								placeholderTextColor={themeColors.foregroundSubtle}
								accessibilityLabel="Buscar idioma"
								className="h-10 flex-1 font-inter text-sm text-foreground outline-none"
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
										item.id === languageId ? 'bg-primary-soft' : ''
									}`}
								>
									<Text className="font-inter text-foreground text-sm">
										{item.name}
									</Text>
									{item.id === languageId && (
										<Check size={14} color={themeColors.primaryText} />
									)}
								</TouchableOpacity>
							))}
							{filteredLanguages.length === 0 && (
								<Text className="px-4 py-3 font-inter text-foreground-subtle text-sm">
									Nenhum idioma encontrado.
								</Text>
							)}
						</ScrollView>
					</View>
				)}
			</View>

			<View className="gap-1.5">
				<Text className="font-inter font-medium text-foreground-secondary text-[13px]">
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
										? 'border-primary bg-primary-soft'
										: 'border-border-strong bg-surface'
								}`}
							>
								<Text
									className={`font-inter text-xs ${
										isSelected
											? 'font-semibold text-primary-strong'
											: 'text-foreground-secondary'
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
				<Text className="font-inter font-medium text-foreground-secondary text-[13px]">
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

			{missingMessage && (
				<View
					accessibilityLiveRegion="polite"
					className="flex-row items-center gap-2 rounded-lg bg-primary-soft px-3 py-2.5"
				>
					<CircleAlert size={16} color={themeColors.primaryText} />
					<Text className="flex-1 font-inter text-primary-strong text-xs">
						{missingMessage}
					</Text>
				</View>
			)}
		</AppModal>
	);
}
