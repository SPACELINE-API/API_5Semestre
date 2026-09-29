import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type {
	TranslatorCreateInput,
	TranslatorLanguageFormRow,
	LanguageResponse,
} from '../types/translator';
import type { QualificationResponse } from '../types/translator';
import {
	listQualifications,
	listLanguages,
	createLanguage,
} from '../services/translatorService';
import { FormField } from '../../clients/components/FormField';
import { TranslatorLanguagesStep } from './TranslatorLanguagesStep';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type Props = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: TranslatorCreateInput) => Promise<void>;
	toast?: ToastData | null;
};

type FormErrors = {
	name?: string;
	email?: string;
	phone?: string;
	languages?: string;
};

const EMPTY_ROW: TranslatorLanguageFormRow = {
	language_id: '',
	proficiency_level: 'fluent',
};

const STEPS = [
	{ title: 'Dados' },
	{ title: 'Idiomas' },
	{ title: 'Qualificações' },
];

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

export function TranslatorFormModal({
	visible,
	onClose,
	onSubmit,
	toast,
}: Props) {
	const [step, setStep] = useState(0);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [languages, setLanguages] = useState<TranslatorLanguageFormRow[]>([
		{ ...EMPTY_ROW },
	]);
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
		if (visible) {
			listQualifications().then(setApiQualifications).catch(console.error);
			listLanguages().then(setApiLanguages).catch(console.error);
		}
	}, [visible]);

	const isLastStep = step === STEPS.length - 1;

	function handleClose() {
		setStep(0);
		setName('');
		setEmail('');
		setPhone('');
		setLanguages([{ ...EMPTY_ROW }]);
		setSelectedQualifications([]);
		setFieldErrors({});
		setSubmitError(null);
		onClose();
	}

	function validateStep0(): FormErrors {
		const errors: FormErrors = {};
		if (!name.trim()) errors.name = 'Nome é obrigatório.';
		if (!email.trim()) errors.email = 'Email é obrigatório.';
		else if (!isValidEmail(email)) errors.email = 'Email inválido.';
		if (!phone.trim()) errors.phone = 'Telefone é obrigatório.';
		else if (!isValidPhone(phone))
			errors.phone = 'Telefone inválido (mínimo 10 dígitos).';
		return errors;
	}

	function validateStep1(): FormErrors {
		const errors: FormErrors = {};
		if (languages.some((language) => !language.language_id)) {
			errors.languages = 'Selecione um idioma para cada item.';
			return errors;
		}
		if (
			new Set(languages.map((language) => language.language_id)).size !==
			languages.length
		) {
			errors.languages = 'Não repita o mesmo idioma.';
			return errors;
		}
		return errors;
	}

	function handleNext() {
		let errors: FormErrors = {};
		if (step === 0) errors = validateStep0();
		if (step === 1) errors = validateStep1();
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}
		setFieldErrors({});
		setStep((s) => s + 1);
	}

	function handleBack() {
		setFieldErrors({});
		setStep((s) => s - 1);
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
			prev.map((row, i) => {
				if (i !== index) return row;
				return { ...row, [field]: value };
			}),
		);
		if (fieldErrors.languages) {
			setFieldErrors((prev) => ({ ...prev, languages: undefined }));
		}
	}

	async function handleCreateLanguage(id: string, name: string) {
		const normalizedId = id.trim();
		const normalizedName = name.trim();
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
		const step0Errors = validateStep0();
		const step1Errors = validateStep1();
		const allErrors = { ...step0Errors, ...step1Errors };
		if (Object.keys(allErrors).length > 0) {
			setFieldErrors(allErrors);
			if (Object.keys(step0Errors).length > 0) setStep(0);
			else setStep(1);
			return;
		}

		setSubmitError(null);
		setIsSubmitting(true);

		try {
			await onSubmit({
				name: name.trim(),
				email: email.trim(),
				phone: phone.trim(),
				qualification_ids: selectedQualifications,
				languages: languages.map((language) => ({
					language_id: language.language_id,
					proficiency_level: language.proficiency_level,
				})),
			});
			handleClose();
		} catch (err) {
			setSubmitError(
				err instanceof Error
					? err.message
					: 'Não foi possível cadastrar o tradutor.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[520px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<Text className="font-inter font-bold text-gray-900 text-lg">
							Novo tradutor
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<View className="gap-2 px-6 py-5">
						<View className="flex-row gap-2">
							{STEPS.map((s, index) => {
								const isActive = index === step;
								const isCompleted = index < step;

								return (
									<View
										key={s.title}
										className={`h-1.5 flex-1 rounded-full ${
											isActive || isCompleted ? 'bg-blue-300' : 'bg-gray-100'
										}`}
									/>
								);
							})}
						</View>
						<View className="flex-row gap-2">
							{STEPS.map((s, index) => {
								const isActive = index === step;
								const isCompleted = index < step;

								return (
									<Text
										key={s.title}
										className={`flex-1 text-center font-inter text-[11px] ${
											isActive || isCompleted
												? 'font-semibold text-blue-900'
												: 'text-gray-400'
										}`}
									>
										{s.title}
									</Text>
								);
							})}
						</View>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						{step === 0 && (
							<>
								<FormField
									label="Nome completo"
									value={name}
									onChangeText={(v) => {
										setName(v);
										if (fieldErrors.name)
											setFieldErrors((p) => ({ ...p, name: undefined }));
									}}
									placeholder="Ex: Carlos Eduardo de Oliveira"
									error={fieldErrors.name}
								/>

								<FormField
									label="Email"
									value={email}
									onChangeText={(v) => {
										setEmail(v);
										if (fieldErrors.email)
											setFieldErrors((p) => ({ ...p, email: undefined }));
									}}
									placeholder="carlos.oliveira@spaceline.com.br"
									autoCapitalize="none"
									error={fieldErrors.email}
								/>

								<FormField
									label="Telefone"
									value={phone}
									onChangeText={(v) => {
										setPhone(maskPhone(v));
										if (fieldErrors.phone)
											setFieldErrors((p) => ({ ...p, phone: undefined }));
									}}
									placeholder="(11) 98765-4321"
									error={fieldErrors.phone}
								/>
							</>
						)}

						{step === 1 && (
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
						)}

						{step === 2 && (
							<View className="gap-3">
								<Text className="font-inter text-gray-600 text-[13px]">
									Selecione as especialidades técnicas deste tradutor
									(opcional):
								</Text>

								{apiQualifications.map((qual) => {
									const isChecked = selectedQualifications.includes(qual.id);
									return (
										<TouchableOpacity
											key={qual.id}
											onPress={() => toggleQualification(qual.id)}
											activeOpacity={0.7}
											className={`flex-row items-start gap-3 rounded-xl border p-3.5 transition-all ${
												isChecked
													? 'border-blue-300 bg-blue-50'
													: 'border-gray-300 bg-white'
											}`}
										>
											<View
												className={`mt-0.5 h-4 w-4 rounded items-center justify-center border ${
													isChecked
														? 'border-blue-600 bg-blue-600'
														: 'border-gray-300 bg-white'
												}`}
											>
												{isChecked && (
													<Text className="text-white text-[10px] font-bold">
														✓
													</Text>
												)}
											</View>
											<View className="flex-1">
												<Text className="font-inter font-semibold text-gray-900 text-sm">
													{qual.name}
												</Text>
												<Text className="font-inter text-gray-500 text-xs mt-0.5">
													{qual.description}
												</Text>
											</View>
										</TouchableOpacity>
									);
								})}

								{submitError && (
									<View className="rounded-lg bg-red-50 px-3 py-2.5 mt-2">
										<Text className="font-inter text-red-900 text-sm">
											{submitError}
										</Text>
									</View>
								)}
							</View>
						)}
					</ScrollView>

					<View className="flex-row items-center justify-between border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={step === 0 ? handleClose : handleBack}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								{step === 0 ? 'Cancelar' : 'Voltar'}
							</Text>
						</TouchableOpacity>

						{isLastStep ? (
							<TouchableOpacity
								onPress={handleSubmit}
								disabled={isSubmitting}
								className={`rounded-lg bg-blue-300 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
							>
								<Text className="font-inter font-semibold text-blue-900 text-sm">
									{isSubmitting ? 'Salvando…' : 'Salvar'}
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={handleNext}
								className="rounded-lg bg-blue-300 px-5 py-2.5"
							>
								<Text className="font-inter font-semibold text-blue-900 text-sm">
									Avançar
								</Text>
							</TouchableOpacity>
						)}
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
