import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type { CompanyCreateInput } from '../types/company';
import {
	fetchAddressByZipCode,
	normalizeZipCode,
} from '../services/cepService';
import { FormField } from './FormField';
import {
	isValidCnpjShape,
	isValidEmail,
	isValidPhone,
} from '../utils/validation';
import { maskCnpj, maskPhone } from '../utils/mask';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type CompanyFormModalProps = {
	visible: boolean;
	onClose: () => void;
	onSubmit: (data: CompanyCreateInput) => Promise<void>;
	toast?: ToastData | null;
};

const EMPTY_FORM: CompanyCreateInput = {
	legal_name: '',
	trade_name: '',
	cnpj: '',
	industry: '',
	phone: '',
	email: '',
	zip_code: '',
	street: '',
	number: '',
	complement: '',
	neighborhood: '',
	city: '',
	state: '',
};

const REQUIRED_FIELDS: { key: keyof CompanyCreateInput; label: string }[] = [
	{ key: 'legal_name', label: 'Razão social' },
	{ key: 'trade_name', label: 'Nome fantasia' },
	{ key: 'cnpj', label: 'CNPJ' },
	{ key: 'industry', label: 'Área de atuação' },
	{ key: 'phone', label: 'Telefone' },
	{ key: 'email', label: 'Email' },
	{ key: 'zip_code', label: 'CEP' },
	{ key: 'street', label: 'Rua' },
	{ key: 'number', label: 'Número' },
	{ key: 'neighborhood', label: 'Bairro' },
	{ key: 'city', label: 'Cidade' },
	{ key: 'state', label: 'Estado' },
];

type FormErrors = Partial<Record<keyof CompanyCreateInput, string>>;

type Step = {
	title: string;
	fields: (keyof CompanyCreateInput)[];
};

const STEPS: Step[] = [
	{
		title: 'Identificação',
		fields: ['legal_name', 'trade_name', 'cnpj', 'industry'],
	},
	{
		title: 'Contato',
		fields: ['phone', 'email'],
	},
	{
		title: 'Endereço',
		fields: [
			'zip_code',
			'number',
			'street',
			'complement',
			'neighborhood',
			'city',
			'state',
		],
	},
];

function validateForm(form: CompanyCreateInput): FormErrors {
	const errors: FormErrors = {};

	for (const { key, label } of REQUIRED_FIELDS) {
		const value = form[key];
		if (!value || value.trim().length === 0) {
			errors[key] = `${label} é obrigatório.`;
		}
	}

	if (
		form.cnpj &&
		form.cnpj.trim().length > 0 &&
		!isValidCnpjShape(form.cnpj)
	) {
		errors.cnpj = 'CNPJ inválido.';
	}

	if (form.email && form.email.trim().length > 0 && !isValidEmail(form.email)) {
		errors.email = 'Email inválido.';
	}

	if (form.phone && form.phone.trim().length > 0 && !isValidPhone(form.phone)) {
		errors.phone = 'Telefone inválido.';
	}

	if (
		form.state &&
		form.state.trim().length > 0 &&
		form.state.trim().length !== 2
	) {
		errors.state = 'Use a sigla do estado (2 letras).';
	}

	return errors;
}

export function CompanyFormModal({
	visible,
	onClose,
	onSubmit,
	toast,
}: CompanyFormModalProps) {
	const [form, setForm] = useState<CompanyCreateInput>(EMPTY_FORM);
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCepLoading, setIsCepLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState(0);
	const isLastStep = step === STEPS.length - 1;

	useEffect(() => {
		const normalized = normalizeZipCode(form.zip_code);

		if (normalized.length !== 8) {
			return;
		}

		let cancelled = false;
		setIsCepLoading(true);

		fetchAddressByZipCode(form.zip_code)
			.then((address) => {
				if (cancelled) return;

				if (!address) {
					setFieldErrors((current) => ({
						...current,
						zip_code: 'CEP não encontrado.',
					}));
					return;
				}

				setForm((current) => ({
					...current,
					street: address.street || current.street,
					neighborhood: address.neighborhood || current.neighborhood,
					city: address.city || current.city,
					state: address.state || current.state,
				}));

				setFieldErrors((current) => {
					if (!current.zip_code) return current;
					const next = { ...current };
					delete next.zip_code;
					return next;
				});
			})
			.catch(() => {
				if (!cancelled) {
					setFieldErrors((current) => ({
						...current,
						zip_code: 'Não foi possível buscar o CEP.',
					}));
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsCepLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [form.zip_code]);

	function setField<K extends keyof CompanyCreateInput>(
		key: K,
		value: CompanyCreateInput[K],
	) {
		setForm((current) => ({ ...current, [key]: value }));

		if (key === 'email') {
			const emailValue = String(value).trim();
			setFieldErrors((current) => {
				if (emailValue.length > 0 && !isValidEmail(emailValue)) {
					return { ...current, email: 'Email inválido.' };
				}
				if (!current.email) return current;
				const next = { ...current };
				delete next.email;
				return next;
			});
			return;
		}

		setFieldErrors((current) => {
			if (!current[key]) return current;
			const next = { ...current };
			delete next[key];
			return next;
		});
	}

	function handleClose() {
		setForm(EMPTY_FORM);
		setFieldErrors({});
		setError(null);
		setStep(0);
		onClose();
	}

	function handleNext() {
		const errors = validateForm(form);
		const stepFields = STEPS[step].fields;
		const stepErrors = Object.fromEntries(
			Object.entries(errors).filter(([key]) =>
				stepFields.includes(key as keyof CompanyCreateInput),
			),
		) as FormErrors;

		if (Object.keys(stepErrors).length > 0) {
			setFieldErrors((current) => ({ ...current, ...stepErrors }));
			return;
		}

		setStep((current) => Math.min(current + 1, STEPS.length - 1));
	}

	function handleBack() {
		setStep((current) => Math.max(current - 1, 0));
	}

	async function handleSubmit() {
		setError(null);

		const errors = validateForm(form);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);

			const firstErrorField = Object.keys(
				errors,
			)[0] as keyof CompanyCreateInput;
			const stepWithError = STEPS.findIndex((s) =>
				s.fields.includes(firstErrorField),
			);
			if (stepWithError !== -1) {
				setStep(stepWithError);
			}
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit(form);
			handleClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível cadastrar o cliente.',
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
							Novo cliente
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
									label="Razão social"
									value={form.legal_name}
									onChangeText={(value) => setField('legal_name', value)}
									placeholder="Ex: Rezende Advogados Ltda"
									error={fieldErrors.legal_name}
								/>
								<View className="flex-row gap-4">
									<FormField
										label="Nome fantasia"
										value={form.trade_name}
										onChangeText={(value) => setField('trade_name', value)}
										placeholder="Ex: Rezende Advogados"
										error={fieldErrors.trade_name}
									/>
									<FormField
										label="CNPJ"
										value={form.cnpj}
										onChangeText={(value) => setField('cnpj', maskCnpj(value))}
										placeholder="00.000.000/0000-00"
										maxLength={18}
										error={fieldErrors.cnpj}
									/>
								</View>
								<FormField
									label="Área de atuação"
									value={form.industry}
									onChangeText={(value) => setField('industry', value)}
									placeholder="Ex: Jurídico"
									error={fieldErrors.industry}
								/>
							</>
						)}

						{step === 1 && (
							<View className="flex-row gap-4">
								<FormField
									label="Telefone"
									value={form.phone}
									onChangeText={(value) => setField('phone', maskPhone(value))}
									placeholder="(00) 00000-0000"
									maxLength={15}
									error={fieldErrors.phone}
								/>
								<FormField
									label="Email"
									value={form.email}
									onChangeText={(value) => setField('email', value)}
									placeholder="contato@empresa.com"
									error={fieldErrors.email}
								/>
							</View>
						)}

						{step === 2 && (
							<>
								<View className="flex-row gap-4">
									<FormField
										label="CEP"
										value={form.zip_code}
										onChangeText={(value) => setField('zip_code', value)}
										placeholder="00000-000"
										error={fieldErrors.zip_code}
										loading={isCepLoading}
									/>
									<FormField
										label="Número"
										value={form.number}
										onChangeText={(value) => setField('number', value)}
										placeholder="Ex: 1000"
										error={fieldErrors.number}
									/>
								</View>
								<FormField
									label="Rua"
									value={form.street}
									onChangeText={(value) => setField('street', value)}
									placeholder="Ex: Avenida Paulista"
									error={fieldErrors.street}
								/>
								<FormField
									label="Complemento"
									value={form.complement ?? ''}
									onChangeText={(value) => setField('complement', value)}
									placeholder="Ex: Sala 202 (opcional)"
								/>
								<View className="flex-row gap-4">
									<FormField
										label="Bairro"
										value={form.neighborhood}
										onChangeText={(value) => setField('neighborhood', value)}
										placeholder="Ex: Bela Vista"
										error={fieldErrors.neighborhood}
									/>
									<FormField
										label="Cidade"
										value={form.city}
										onChangeText={(value) => setField('city', value)}
										placeholder="Ex: São Paulo"
										error={fieldErrors.city}
									/>
								</View>
								<View className="w-24">
									<FormField
										label="Estado"
										value={form.state}
										onChangeText={(value) =>
											setField('state', value.toUpperCase())
										}
										placeholder="SP"
										autoCapitalize="characters"
										maxLength={2}
										error={fieldErrors.state}
									/>
								</View>
							</>
						)}

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
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
