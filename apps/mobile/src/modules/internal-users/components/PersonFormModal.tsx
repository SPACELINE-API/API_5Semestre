import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import type { Role } from '../../auth/types/roles';
import { maskPhone } from '../../clients/utils/mask';
import type { InternalUser } from '../types/internalUser';
import { RoleMultiSelect } from './RoleMultiSelect';

export type PersonFormValues = {
	name: string;
	email: string;
	phone: string;
	roleIds: string[];
};

type PersonFormModalProps = {
	visible: boolean;
	person: InternalUser | null;
	roles: Role[];
	onClose: () => void;
	onSubmit: (values: PersonFormValues) => Promise<void>;
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validatePersonForm(values: PersonFormValues) {
	if (!values.name.trim()) return 'Informe o nome.';
	if (!EMAIL_PATTERN.test(values.email.trim()))
		return 'Informe um e-mail válido.';
	if (values.phone.replace(/\D/g, '').length < 10)
		return 'Informe um telefone válido, com DDD.';
	if (values.roleIds.length === 0) return 'Selecione ao menos um perfil.';
	return null;
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<View className="gap-1.5">
			<Text className="font-inter font-semibold text-gray-800 text-xs">
				{label}
			</Text>
			{children}
		</View>
	);
}

const INPUT_CLASS =
	'rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none';

export function PersonFormModal({
	visible,
	person,
	roles,
	onClose,
	onSubmit,
}: PersonFormModalProps) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [phone, setPhone] = useState('');
	const [roleIds, setRoleIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (!visible) return;
		setName(person?.name ?? '');
		setEmail(person?.email ?? '');
		setPhone(person?.phone ? maskPhone(person.phone) : '');
		setRoleIds(person ? person.roles.map((role) => role.id) : []);
		setError(null);
	}, [visible, person]);

	const isEditing = person !== null;
	const emailLocked = isEditing && person.password_defined;

	async function handleSubmit() {
		const values = { name, email, phone, roleIds };
		const validation = validatePersonForm(values);
		if (validation) {
			setError(validation);
			return;
		}
		setIsSubmitting(true);
		setError(null);
		try {
			await onSubmit({
				name: name.trim(),
				email: email.trim().toLowerCase(),
				phone,
				roleIds,
			});
			onClose();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível salvar. Tente novamente.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<AppModal
			visible={visible}
			size="md"
			title={isEditing ? 'Editar pessoa' : 'Convidar pessoa'}
			message={
				isEditing
					? 'Atualize os dados e os perfis desta pessoa.'
					: 'A pessoa recebe um e-mail para definir a própria senha. A conta fica inativa até lá.'
			}
			confirmLabel={isEditing ? 'Salvar' : 'Convidar'}
			isLoading={isSubmitting}
			onConfirm={() => void handleSubmit()}
			onClose={onClose}
		>
			<View className="gap-4">
				<Field label="Nome completo">
					<TextInput
						value={name}
						onChangeText={setName}
						placeholder="Ex: Ana Souza"
						placeholderTextColor="#8A8A8A"
						maxLength={150}
						accessibilityLabel="Nome completo"
						className={INPUT_CLASS}
					/>
				</Field>

				<Field label="E-mail">
					{emailLocked ? (
						<View className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
							<Text className="font-inter text-gray-500 text-sm">{email}</Text>
						</View>
					) : (
						<TextInput
							value={email}
							onChangeText={setEmail}
							placeholder="nome@empresa.com"
							placeholderTextColor="#8A8A8A"
							autoCapitalize="none"
							keyboardType="email-address"
							maxLength={255}
							accessibilityLabel="E-mail"
							className={INPUT_CLASS}
						/>
					)}
					{emailLocked && (
						<Text className="font-inter text-gray-400 text-xs">
							O e-mail não pode ser alterado depois que a senha é definida.
						</Text>
					)}
				</Field>

				<Field label="Telefone">
					<TextInput
						value={phone}
						onChangeText={(value) => setPhone(maskPhone(value))}
						placeholder="(11) 99999-0000"
						placeholderTextColor="#8A8A8A"
						keyboardType="phone-pad"
						accessibilityLabel="Telefone"
						className={INPUT_CLASS}
					/>
				</Field>

				<Field label="Perfis">
					<RoleMultiSelect
						roles={roles}
						selectedIds={roleIds}
						onChange={(ids) => {
							setError(null);
							setRoleIds(ids);
						}}
					/>
				</Field>

				{error && (
					<View className="rounded-lg bg-red-50 px-3 py-2.5">
						<Text className="font-inter text-red-900 text-sm">{error}</Text>
					</View>
				)}
			</View>
		</AppModal>
	);
}
