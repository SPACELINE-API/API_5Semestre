import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Mail, Pencil, Phone, UserRound } from 'lucide-react-native';
import { FormField } from '../../clients/components/FormField';
import { maskPhone } from '../../clients/utils/mask';
import { updateMyProfile } from '../services/profileService';
import type { TranslatorProfile } from '../types/profile';

type ProfileDataCardProps = {
	profile: TranslatorProfile;
	onChange: (profile: TranslatorProfile) => void;
	onSuccess: (message: string) => void;
};

type FormErrors = { name?: string; phone?: string };

function validate(name: string, phone: string): FormErrors {
	const errors: FormErrors = {};
	if (!name.trim()) errors.name = 'Nome é obrigatório.';
	if (!phone.trim()) errors.phone = 'Telefone é obrigatório.';
	else if (phone.replace(/\D/g, '').length < 10)
		errors.phone = 'Telefone inválido (mínimo 10 dígitos).';
	return errors;
}

export function ProfileDataCard({
	profile,
	onChange,
	onSuccess,
}: ProfileDataCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [name, setName] = useState(profile.name);
	const [phone, setPhone] = useState(maskPhone(profile.phone));
	const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function startEditing() {
		setName(profile.name);
		setPhone(maskPhone(profile.phone));
		setFieldErrors({});
		setError(null);
		setIsEditing(true);
	}

	async function handleSave() {
		const errors = validate(name, phone);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			return;
		}

		setIsSaving(true);
		setError(null);
		try {
			onChange(await updateMyProfile({ name: name.trim(), phone }));
			setIsEditing(false);
			onSuccess('Dados atualizados com sucesso.');
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível salvar as alterações.',
			);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<View className="gap-4 rounded-xl border border-gray-100 p-5">
			<View className="flex-row items-center justify-between">
				<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">
					Dados pessoais
				</Text>
				{!isEditing && (
					<TouchableOpacity
						onPress={startEditing}
						activeOpacity={0.7}
						accessibilityRole="button"
						className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
					>
						<Pencil size={14} color="#353535" />
						<Text className="font-inter font-semibold text-gray-800 text-xs">
							Editar
						</Text>
					</TouchableOpacity>
				)}
			</View>

			{isEditing ? (
				<View className="gap-4">
					<FormField
						label="Nome completo"
						value={name}
						onChangeText={(value) => {
							setName(value);
							if (fieldErrors.name)
								setFieldErrors((current) => ({ ...current, name: undefined }));
						}}
						placeholder="Seu nome completo"
						error={fieldErrors.name}
					/>
					<FormField
						label="Telefone"
						value={phone}
						onChangeText={(value) => {
							setPhone(maskPhone(value));
							if (fieldErrors.phone)
								setFieldErrors((current) => ({ ...current, phone: undefined }));
						}}
						placeholder="(11) 98765-4321"
						maxLength={15}
						error={fieldErrors.phone}
					/>
					<View className="gap-1.5">
						<Text className="font-inter font-semibold text-gray-800 text-xs">
							Email
						</Text>
						<Text className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 font-inter text-gray-500 text-sm">
							{profile.email}
						</Text>
						<Text className="font-inter text-gray-400 text-xs">
							O email é o seu acesso à plataforma e não pode ser alterado aqui.
						</Text>
					</View>

					{error && (
						<View className="rounded-lg bg-red-50 px-3 py-2.5">
							<Text className="font-inter text-red-900 text-sm">{error}</Text>
						</View>
					)}

					<View className="flex-row items-center justify-end gap-3">
						<TouchableOpacity
							onPress={() => setIsEditing(false)}
							disabled={isSaving}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => void handleSave()}
							disabled={isSaving}
							className={`rounded-lg bg-blue-600 px-5 py-2.5 ${isSaving ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter-medium text-sm text-white">
								{isSaving ? 'Salvando…' : 'Salvar alterações'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			) : (
				<View className="gap-3">
					<View className="flex-row items-center gap-3">
						<UserRound size={16} color="#6B7280" />
						<Text className="font-inter text-gray-700 text-sm">
							{profile.name}
						</Text>
					</View>
					<View className="flex-row items-center gap-3">
						<Mail size={16} color="#6B7280" />
						<Text className="font-inter text-gray-700 text-sm">
							{profile.email}
						</Text>
					</View>
					<View className="flex-row items-center gap-3">
						<Phone size={16} color="#6B7280" />
						<Text className="font-inter text-gray-700 text-sm">
							{maskPhone(profile.phone)}
						</Text>
					</View>
				</View>
			)}
		</View>
	);
}
