import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerAsset } from 'expo-document-picker';

import { useRouter } from 'expo-router';

import { useEffect, useState } from 'react';
import {
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { FileUp, Trash } from 'lucide-react-native';

import { createRequest } from '../services/requests';
import { isValidEmail } from '../../clients/utils/validation';
import { RequestLanguageSelect } from './RequestLanguageSelect';
import { listPublicLanguages } from '../../translators/services/translatorService';
import type { LanguageResponse } from '../../translators/types/translator';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export default function FormsRequest() {
	const themeColors = useThemeColors();
	const [customerName, setCustomerName] = useState('');
	const [email, setEmail] = useState('');
	const [emailError, setEmailError] = useState('');
	const [enterprise, setEnterprise] = useState('');
	const [customerNeed, setCustomerNeed] = useState('');
	const [originalLanguage, setOriginalLanguage] = useState('');
	const [translationLanguage, setTranslationLanguage] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [document, setDocument] = useState<DocumentPickerAsset | null>(null);
	const [availableLanguages, setAvailableLanguages] = useState<
		LanguageResponse[]
	>([]);
	const [loadingLanguages, setLoadingLanguages] = useState(true);
	const [languageLoadError, setLanguageLoadError] = useState('');

	const router = useRouter();

	const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

	function cleanFileName(fileName: string): string {
		// Remove hash do nome do arquivo (ex: "arquivo-1234567890.pdf" -> "arquivo.pdf")
		return fileName.replace(/-\d+\.(?=[^.]+$)/, '.');
	}

	useEffect(() => {
		let isCurrent = true;

		listPublicLanguages()
			.then((languages) => {
				if (isCurrent) setAvailableLanguages(languages);
			})
			.catch(() => {
				if (isCurrent) {
					setLanguageLoadError('Não foi possível carregar os idiomas.');
				}
			})
			.finally(() => {
				if (isCurrent) setLoadingLanguages(false);
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	async function handleSubmit() {
		setError('');
		setSuccess('');

		const fields = [
			customerName,
			email,
			enterprise,
			customerNeed,
			originalLanguage,
			translationLanguage,
		];

		if (fields.some((field) => !field.trim())) {
			setError('Preencha todos os campos obrigatórios.');
			return;
		}

		if (!isValidEmail(email)) {
			setEmailError(
				'Email inválido. Informe um endereço como nome@exemplo.com.',
			);
			return;
		}

		setEmailError('');

		setSubmitting(true);
		const result = await createRequest({
			customer_name: customerName,
			email,
			enterprise,
			customer_need: customerNeed,
			original_language: originalLanguage,
			translation_language: translationLanguage,
			document: document
				? {
						uri: document.uri,
						name: cleanFileName(document.name),
						type: document.mimeType,
						file: document.file,
					}
				: null,
		});
		setSubmitting(false);

		if (result.success) {
			setSuccess('Solicitação enviada com sucesso!');
			setCustomerName('');
			setEmail('');
			setEnterprise('');
			setCustomerNeed('');
			setOriginalLanguage('');
			setTranslationLanguage('');
			setDocument(null);
			setTimeout(() => router.replace('/login'), 1500);
		} else if (result.status === 400) {
			setError(
				'Você precisa aguardar no mínimo uma semana para enviar outra solicitação.',
			);
		} else {
			setError(
				result.detail ??
					'Não foi possível enviar a solicitação. Tente novamente.',
			);
		}
	}

	async function uploadFile() {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				copyToCacheDirectory: Platform.OS !== 'android',
				type: [
					'application/pdf',
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				],
			});

			if (result.canceled) {
				return;
			}

			const file = result.assets[0];

			if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
				setError('Tamanho de arquivo não aceito.');
				return;
			}

			setError('');
			setDocument({
				...file,
				name: cleanFileName(file.name),
			});
		} catch {
			setError(
				'Não foi possível abrir o arquivo selecionado. Tente escolher outro arquivo.',
			);
		}
	}

	return (
		<View className="w-full rounded-[28px] border border-surface/80 bg-surface/90 px-6 py-7 shadow-2xl shadow-overlay/15 sm:px-9 sm:py-8">
			<View className="mb-6">
				<Text className="text-[22px] font-extrabold tracking-[-0.6px] text-foreground">
					Solicitação de serviço
				</Text>
				<Text className="mt-1 text-sm text-foreground-muted">
					Conte para a gente o que você precisa traduzir
				</Text>
			</View>

			<View className="gap-3">
				<Text className="text-sm font-bold text-primary-text mt-4">
					DADOS PESSOAIS
				</Text>

				<View className="flex flex-col gap-4 md:flex-row md:flex-wrap">
					<View className="w-full gap-1 md:min-w-[200px] md:flex-1">
						<Text className="mb-1 text-sm font-bold text-foreground">
							Nome
							<Text className="text-danger">*</Text>
						</Text>
						<TextInput
							value={customerName}
							onChangeText={setCustomerName}
							placeholder="Digite seu nome"
							placeholderTextColor={themeColors.foregroundSubtle}
							className="h-11 rounded-xl border border-border bg-surface-subtle px-4 text-sm text-foreground"
						/>
					</View>

					<View className="w-full md:min-w-[200px] md:flex-1">
						<Text className="mb-1 text-sm font-bold text-foreground">
							Email
							<Text className="text-danger">*</Text>
						</Text>

						<TextInput
							value={email}
							onChangeText={(value) => {
								setEmail(value);

								if (emailError) {
									setEmailError(
										value.trim() && !isValidEmail(value)
											? 'Email inválido. Informe um endereço como nome@exemplo.com.'
											: '',
									);
								}
							}}
							placeholder="seuemail@exemplo.com"
							placeholderTextColor={themeColors.foregroundSubtle}
							keyboardType="email-address"
							autoCapitalize="none"
							className="h-11 w-full rounded-xl border border-border bg-surface-subtle px-4 text-sm text-foreground"
						/>

						{emailError ? (
							<Text className="mt-1 text-sm text-danger">{emailError}</Text>
						) : null}
					</View>

					<View className="w-full gap-1 md:min-w-[200px] md:flex-1">
						<Text className="mb-1 text-sm font-bold text-foreground">
							Empresa
							<Text className="text-danger">*</Text>
						</Text>
						<TextInput
							value={enterprise}
							onChangeText={setEnterprise}
							placeholder="Nome da empresa"
							placeholderTextColor={themeColors.foregroundSubtle}
							className="h-11 rounded-xl border border-border bg-surface-subtle px-4 text-sm text-foreground"
						/>
					</View>
				</View>
			</View>

			<View className="mt-6 gap-3">
				<Text className="text-sm font-bold text-primary-text mt-4">
					SERVIÇO
				</Text>

				<View className="flex flex-col gap-4 md:flex-row md:flex-wrap">
					<View className="w-full gap-1 md:min-w-[200px] md:flex-1">
						<Text className="mb-1 text-sm font-bold text-foreground">
							Tipo de documento
							<Text className="text-danger">*</Text>
						</Text>
						<TextInput
							value={customerNeed}
							onChangeText={setCustomerNeed}
							placeholder="Ex: Diploma, contrato social"
							placeholderTextColor={themeColors.foregroundSubtle}
							className="h-11 rounded-xl border border-border bg-surface-subtle px-4 text-sm text-foreground"
						/>
					</View>

					<RequestLanguageSelect
						label="Idioma original"
						value={originalLanguage}
						languages={availableLanguages}
						loading={loadingLanguages}
						onChange={setOriginalLanguage}
					/>

					<RequestLanguageSelect
						label="Idioma de tradução"
						value={translationLanguage}
						languages={availableLanguages}
						loading={loadingLanguages}
						onChange={setTranslationLanguage}
					/>
				</View>

				{languageLoadError ? (
					<Text className="text-sm text-danger">{languageLoadError}</Text>
				) : null}
			</View>

			<View className="mt-6 gap-3">
				<Text className="text-sm font-bold text-primary-text mt-4">
					DOCUMENTO (PDF/DOCX)
				</Text>

				<View className="w-full gap-1">
					<TouchableOpacity
						className="flex flex-column items-center justify-center gap-5 h-40 rounded-xl border border-dashed border-border bg-surface-subtle px-4 text-sm text-foreground"
						onPress={uploadFile}
					>
						<FileUp color={themeColors.borderStrong} size={'60px'} />
						<Text className="mb-1 text-sm text-foreground-subtle">
							Faça o upload do documento a ser traduzido
						</Text>
					</TouchableOpacity>

					{document ? (
						<View className="mt-6 w-full flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4">
							<Text
								className="min-w-0 flex-1 text-sm text-foreground"
								numberOfLines={2}
								ellipsizeMode="middle"
							>
								{document.name}
							</Text>
							<TouchableOpacity
								className="shrink-0"
								onPress={() => setDocument(null)}
							>
								<Trash color={'red'} />
							</TouchableOpacity>
						</View>
					) : (
						<></>
					)}
				</View>
			</View>

			{error ? (
				<Text className="mb-2 mt-4 text-sm text-danger">{error}</Text>
			) : null}

			<View className="mt-8 w-full flex-col gap-3 sm:w-auto sm:flex-row sm:self-end">
				<TouchableOpacity
					onPress={handleSubmit}
					disabled={submitting}
					className="h-12 w-full items-center justify-center rounded-full bg-primary px-5 shadow-md shadow-primary/30 sm:w-auto"
				>
					<Text className="text-sm font-bold text-primary-foreground">
						{submitting ? 'ENVIANDO...' : 'ENVIAR SOLICITAÇÃO'}
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					onPress={() => router.replace('/login')}
					className="h-12 w-full items-center justify-center rounded-full border border-primary bg-surface px-5 sm:w-auto"
				>
					<Text className="text-sm font-bold text-primary-text">VOLTAR</Text>
				</TouchableOpacity>
			</View>

			{success ? (
				<Text className="mt-5 text-center text-sm font-semibold text-success-text">
					{success}
				</Text>
			) : null}
		</View>
	);
}
