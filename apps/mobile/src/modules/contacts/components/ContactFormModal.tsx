import { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import type { Contact, ContactCreateInput } from '../types/contact';
import { FormField } from '../../clients/components/FormField';
import { isValidEmail, isValidPhone } from '../../clients/utils/validation';
import { maskPhone } from '../../clients/utils/mask';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';

type ContactFormModalProps = {
	visible: boolean;
	companyId: string;
	contact?: Contact | null;
	onClose: () => void;
	onSubmit: (data: ContactCreateInput) => Promise<void>;
	toast?: ToastData | null;
};

type FormData = Omit<ContactCreateInput, 'company_id'>;

const EMPTY_FORM: FormData = {
	name: '',
	department: '',
	phone: '',
	email: '',
};

const REQUIRED_FIELDS: { key: keyof FormData; label: string }[] = [
	{ key: 'name', label: 'Nome' },
	{ key: 'department', label: 'Departamento' },
	{ key: 'phone', label: 'Telefone' },
	{ key: 'email', label: 'Email' },
];

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateForm(form: FormData): FormErrors {
	const errors: FormErrors = {};

	for (const { key, label } of REQUIRED_FIELDS) {
		const value = form[key];
		if (!value || value.trim().length === 0) {
			errors[key] = `${label} é obrigatório.`;
		}
	}

	if (form.email && form.email.trim().length > 0 && !isValidEmail(form.email)) {
		errors.email = 'Email inválido.';
	}

	if (form.phone && form.phone.trim().length > 0 && !isValidPhone(form.phone)) {
		errors.phone = 'Telefone inválido.';
	}

	return errors;
}

export function ContactFormModal({
	visible,
	companyId,
	contact,
	onClose,
	onSubmit,
	toast,
}: ContactFormModalProps) {
	const [form, setForm] = useState<FormData>(EMPTY_FORM);
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (visible) {
			if (contact) {
				setForm({
					name: contact.name,
					department: contact.department,
					phone: contact.phone,
					email: contact.email,
				});
			} else {
				setForm(EMPTY_FORM);
			}
			setFieldErrors({});
			setError(null);
		}
	}, [visible, contact]);

	function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
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
		onClose();
	}

	async function handleSubmit() {
		setError(null);

		const errors = validateForm(form);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit({
				...form,
				company_id: companyId,
			});
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível salvar o contato.',
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
							{contact ? 'Editar funcionário' : 'Novo funcionário'}
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView className="px-6 py-6" contentContainerClassName="gap-5">
						<FormField
							label="Nome"
							value={form.name}
							onChangeText={(value) => setField('name', value)}
							placeholder="Ex: João da Silva"
							error={fieldErrors.name}
						/>
						<FormField
							label="Departamento"
							value={form.department}
							onChangeText={(value) => setField('department', value)}
							placeholder="Ex: Financeiro"
							error={fieldErrors.department}
						/>
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
								placeholder="joao@empresa.com"
								error={fieldErrors.email}
							/>
						</View>

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</ScrollView>
					<View className="flex-row items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
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
								{isSubmitting ? 'Salvando…' : 'Salvar'}
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
