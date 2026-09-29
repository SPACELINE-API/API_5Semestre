import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type {
	LanguageResponse,
	QualificationResponse,
	Translator,
	TranslatorLanguageFormRow,
	TranslatorUpdateInput,
} from '../types/translator';
import {
	listQualifications,
	listLanguages,
	createLanguage,
} from '../services/translatorService';
import { FormField } from '../../clients/components/FormField';
import { TranslatorLanguagesStep } from './TranslatorLanguagesStep';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type TranslatorEditModalProps = {
	visible: boolean;
	translator: Translator | null;
	onClose: () => void;
	onSubmit: (
		data: TranslatorUpdateInput & { is_active: boolean },
	) => Promise<void>;
	toast?: ToastData | null;
};

type FormErrors = {
	name?: string;
	email?: string;
	phone?: string;
	languages?: string;
};

function isValidEmail(email: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
	return phone.replace(/\D/g, '').length >= 10;
}

function maskPhone(value: string) {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (digits.length <= 2) return digits;
	if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
	if (digits.length <= 11)
		return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
	return value;
}

function translatorToForm(translator: Translator) {
	return {
		name: translator.name,
		email: translator.email,
		phone: maskPhone(translator.phone),
		is_active: translator.is_active,
		languages: translator.languages.map(
			(language): TranslatorLanguageFormRow => ({
				language_id: language.language_id,
				proficiency_level: language.proficiency_level,
			}),
		),
		qualification_ids: translator.qualifications.map(
			(qualification) => qualification.id,
		),
	};
}

export function TranslatorEditModal({
	visible,
	translator,
	onClose,
	onSubmit,
	toast,
}: TranslatorEditModalProps) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [isActive, setIsActive] = useState(true);
	const [languages, setLanguages] = useState<TranslatorLanguageFormRow[]>([]);
	const [selectedQualifications, setSelectedQualifications] = useState<
		string[]
	>([]);
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const [apiQualifications, setApiQualifications] = useState<
		QualificationResponse[]
	>([]);
	const [apiLanguages, setApiLanguages] = useState<LanguageResponse[]>([]);
	const [languageCreateError, setLanguageCreateError] = useState<
		string | undefined
	>();

	useEffect(() => {
		if (visible && translator) {
			const form = translatorToForm(translator);
			setName(form.name);
			setEmail(form.email);
			setPhone(form.phone);
			setIsActive(form.is_active);
			setLanguages(form.languages);
			setSelectedQualifications(form.qualification_ids);
			setFieldErrors({});
			setSubmitError(null);
		}
	}, [visible, translator]);

	useEffect(() => {
		if (visible) {
			listQualifications().then(setApiQualifications).catch(console.error);
			listLanguages().then(setApiLanguages).catch(console.error);
		}
	}, [visible]);

	function handleClose() {
		setFieldErrors({});
		setSubmitError(null);
		onClose();
	}

	function validateForm(): FormErrors {
		const errors: FormErrors = {};
		if (!name.trim()) errors.name = 'Nome é obrigatório.';
		if (!email.trim()) errors.email = 'Email é obrigatório.';
		else if (!isValidEmail(email)) errors.email = 'Email inválido.';
		if (!phone.trim()) errors.phone = 'Telefone é obrigatório.';
		else if (!isValidPhone(phone))
			errors.phone = 'Telefone inválido (mínimo 10 dígitos).';

		if (languages.length === 0) {
			errors.languages = 'Adicione ao menos um idioma.';
		} else if (languages.some((language) => !language.language_id)) {
			errors.languages = 'Selecione um idioma para cada item.';
		} else if (
			new Set(languages.map((language) => language.language_id)).size !==
			languages.length
		) {
			errors.languages = 'Não repita o mesmo idioma.';
		}

		return errors;
	}

	function addLanguage() {
		const nextLanguage = apiLanguages.find(
			(language) =>
				!languages.some((selected) => selected.language_id === language.id),
		);
		setLanguages((prev) => [
			...prev,
			{
				language_id: nextLanguage?.id ?? '',
				proficiency_level: 'intermediate',
			},
		]);
	}

	function removeLanguage(index: number) {
		setLanguages((prev) => prev.filter((_, i) => i !== index));
	}

	function updateLanguage(
		index: number,
		field: keyof TranslatorLanguageFormRow,
		value: string,
	) {
		setLanguages((prev) =>
			prev.map((row, i) => (i !== index ? row : { ...row, [field]: value })),
		);
		if (fieldErrors.languages) {
			setFieldErrors((prev) => ({ ...prev, languages: undefined }));
		}
	}

	async function handleCreateLanguage(id: string, languageName: string) {
		const normalizedId = id.trim();
		const normalizedName = languageName.trim();
		if (!normalizedId || !normalizedName) {
			setLanguageCreateError('Informe a sigla e o nome do idioma.');
			return null;
		}
		if (
			apiLanguages.some(
				(language) => language.id.toLowerCase() === normalizedId.toLowerCase(),
			)
		) {
			setLanguageCreateError('Já existe um idioma com essa sigla.');
			return null;
		}
		try {
			const created = await createLanguage(normalizedId, normalizedName);
			setApiLanguages((current) => [...current, created]);
			setLanguageCreateError(undefined);
			return created;
		} catch (error) {
			setLanguageCreateError(
				error instanceof Error
					? error.message
					: 'Não foi possível cadastrar o idioma.',
			);
			return null;
		}
	}

	function toggleQualification(id: string) {
		setSelectedQualifications((prev) =>
			prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
		);
	}

	async function handleSubmit() {
		const errors = validateForm();
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		setSubmitError(null);
		setIsSubmitting(true);

		try {
			await onSubmit({
				name: name.trim(),
				email: email.trim(),
				phone: phone.trim(),
				is_active: isActive,
				qualification_ids: selectedQualifications,
				languages: languages.map((language) => ({
					language_id: language.language_id,
					proficiency_level: language.proficiency_level,
				})),
			});
			handleClose();
		} catch (error) {
			setSubmitError(
				error instanceof Error
					? error.message
					: 'Não foi possível salvar as alterações.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (!translator) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="max-h-[85%] w-full max-w-[520px] overflow-hidden rounded-xl bg-white">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<Text className="font-inter font-bold text-gray-900 text-lg">
							Editar tradutor
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4">
						<View className="gap-0.5">
							<Text className="font-inter font-semibold text-gray-800 text-sm">
								Status do tradutor
							</Text>
							<Text className="font-inter text-gray-400 text-xs">
								{isActive ? 'Ativo' : 'Inativo'}
							</Text>
						</View>

						<TouchableOpacity
							onPress={() => setIsActive((current) => !current)}
							activeOpacity={0.8}
							className={`h-5 w-9 justify-center rounded-full px-0.5 ${
								isActive ? 'bg-blue-500' : 'bg-gray-300'
							}`}
						>
							<View
								className={`h-4 w-4 rounded-full bg-white ${
									isActive ? 'ml-4' : 'ml-0'
								}`}
							/>
						</TouchableOpacity>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						<Text className="font-inter font-bold text-gray-900 text-sm">
							Dados
						</Text>
						<FormField
							label="Nome completo"
							value={name}
							onChangeText={(value) => {
								setName(value);
								if (fieldErrors.name)
									setFieldErrors((prev) => ({ ...prev, name: undefined }));
							}}
							placeholder="Ex: Carlos Eduardo de Oliveira"
							error={fieldErrors.name}
						/>
						<FormField
							label="Email"
							value={email}
							onChangeText={(value) => {
								setEmail(value);
								if (fieldErrors.email)
									setFieldErrors((prev) => ({ ...prev, email: undefined }));
							}}
							placeholder="carlos.oliveira@spaceline.com.br"
							autoCapitalize="none"
							error={fieldErrors.email}
						/>
						<FormField
							label="Telefone"
							value={phone}
							onChangeText={(value) => {
								setPhone(maskPhone(value));
								if (fieldErrors.phone)
									setFieldErrors((prev) => ({ ...prev, phone: undefined }));
							}}
							placeholder="(11) 98765-4321"
							error={fieldErrors.phone}
						/>

						<Text className="mt-2 font-inter font-bold text-gray-900 text-sm">
							Idiomas
						</Text>
						<TranslatorLanguagesStep
							languages={languages}
							availableLanguages={apiLanguages}
							error={fieldErrors.languages}
							onAddLanguage={addLanguage}
							onRemoveLanguage={removeLanguage}
							onUpdateLanguage={updateLanguage}
							onCreateLanguage={handleCreateLanguage}
							createLanguageError={languageCreateError}
							onClearCreateLanguageError={() =>
								setLanguageCreateError(undefined)
							}
						/>

						<Text className="mt-2 font-inter font-bold text-gray-900 text-sm">
							Qualificações
						</Text>
						<View className="gap-3">
							{apiQualifications.map((qualification) => {
								const isChecked = selectedQualifications.includes(
									qualification.id,
								);
								return (
									<TouchableOpacity
										key={qualification.id}
										onPress={() => toggleQualification(qualification.id)}
										activeOpacity={0.7}
										className={`flex-row items-start gap-3 rounded-xl border p-3.5 ${
											isChecked
												? 'border-blue-300 bg-blue-50'
												: 'border-gray-300 bg-white'
										}`}
									>
										<View
											className={`mt-0.5 h-4 w-4 items-center justify-center rounded border ${
												isChecked
													? 'border-blue-600 bg-blue-600'
													: 'border-gray-300 bg-white'
											}`}
										>
											{isChecked && (
												<Text className="text-[10px] font-bold text-white">
													✓
												</Text>
											)}
										</View>
										<View className="flex-1">
											<Text className="font-inter font-semibold text-gray-900 text-sm">
												{qualification.name}
											</Text>
											{qualification.description && (
												<Text className="mt-0.5 font-inter text-gray-500 text-xs">
													{qualification.description}
												</Text>
											)}
										</View>
									</TouchableOpacity>
								);
							})}
						</View>

						{submitError && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">
									{submitError}
								</Text>
							</View>
						)}
					</ScrollView>

					<View className="flex-row items-center justify-between border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							className={`rounded-lg bg-blue-300 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-blue-900 text-sm">
								{isSubmitting ? 'Salvando…' : 'Salvar alterações'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{toast && (
					<View pointerEvents="none" className="absolute bottom-6 left-6">
						<ToastMessage toast={toast} />
					</View>
				)}
			</View>
		</Modal>
	);
}
