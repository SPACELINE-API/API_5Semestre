import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type { Company, CompanyUpdateInput } from '../types/company';
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

type CompanyEditModalProps = {
	visible: boolean;
	company: Company | null;
	onClose: () => void;
	onSubmit: (data: CompanyUpdateInput) => Promise<void>;
	toast?: ToastData | null;
};

type FormErrors = Partial<Record<keyof CompanyUpdateInput, string>>;

const REQUIRED_FIELDS: { key: keyof CompanyUpdateInput; label: string }[] = [
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

function companyToForm(company: Company): CompanyUpdateInput {
	return {
		legal_name: company.legal_name,
		trade_name: company.trade_name,
		cnpj: maskCnpj(company.cnpj),
		industry: company.industry,
		phone: maskPhone(company.phone),
		email: company.email,
		zip_code: company.zip_code,
		street: company.street,
		number: company.number,
		complement: company.complement ?? '',
		neighborhood: company.neighborhood,
		city: company.city,
		state: company.state,
		is_active: company.is_active,
	};
}

function validateForm(form: CompanyUpdateInput): FormErrors {
	const errors: FormErrors = {};

	for (const { key, label } of REQUIRED_FIELDS) {
		const value = form[key];
		if (typeof value !== 'string' || value.trim().length === 0) {
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

export function CompanyEditModal({
	visible,
	company,
	onClose,
	onSubmit,
	toast,
}: CompanyEditModalProps) {
	const [form, setForm] = useState<CompanyUpdateInput | null>(null);
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isCepLoading, setIsCepLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (visible && company) {
			setForm(companyToForm(company));
			setFieldErrors({});
			setError(null);
		}
	}, [visible, company]);

	useEffect(() => {
		if (!form) return;

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

				setForm((current) =>
					current
						? {
								...current,
								street: address.street || current.street,
								neighborhood: address.neighborhood || current.neighborhood,
								city: address.city || current.city,
								state: address.state || current.state,
							}
						: current,
				);

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
	}, [form?.zip_code]);

	function setField<K extends keyof CompanyUpdateInput>(
		key: K,
		value: CompanyUpdateInput[K],
	) {
		setForm((current) => (current ? { ...current, [key]: value } : current));

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
		setFieldErrors({});
		setError(null);
		onClose();
	}

	async function handleSubmit() {
		if (!form) return;

		setError(null);

		const errors = validateForm(form);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
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
					: 'Não foi possível salvar as alterações.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (!form) return null;

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[560px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<Text className="font-inter font-bold text-gray-900 text-lg">
							Editar empresa
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4">
						<View className="gap-0.5">
							<Text className="font-inter font-semibold text-gray-800 text-sm">
								Status da empresa
							</Text>
							<Text className="font-inter text-gray-400 text-xs">
								{form.is_active ? 'Ativa' : 'Inativa'}
							</Text>
						</View>

						<TouchableOpacity
							onPress={() => setField('is_active', !form.is_active)}
							activeOpacity={0.8}
							className={`h-5 w-9 justify-center rounded-full px-0.5 ${
								form.is_active ? 'bg-blue-500' : 'bg-gray-300'
							}`}
						>
							<View
								className={`h-4 w-4 rounded-full bg-white ${
									form.is_active ? 'ml-4' : 'ml-0'
								}`}
							/>
						</TouchableOpacity>
					</View>

					<ScrollView className="px-6 py-4" contentContainerClassName="gap-4">
						<Text className="font-inter font-bold text-gray-900 text-sm">
							Identificação
						</Text>
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

						<Text className="mt-2 font-inter font-bold text-gray-900 text-sm">
							Contato
						</Text>
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

						<Text className="mt-2 font-inter font-bold text-gray-900 text-sm">
							Endereço
						</Text>
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
								onChangeText={(value) => setField('state', value.toUpperCase())}
								placeholder="SP"
								autoCapitalize="characters"
								maxLength={2}
								error={fieldErrors.state}
							/>
						</View>

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
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
