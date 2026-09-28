import { RefObject } from 'react';
import { Text, TextInput, View } from 'react-native';
import { PasswordField } from './PasswordField';

type LoginFieldsProps = {
	token: string;
	recovery: boolean;
	email: string;
	password: string;
	newPassword: string;
	confirmation: string;
	showPassword: boolean;
	showNewPassword: boolean;
	showConfirmation: boolean;
	passwordInputRef: RefObject<TextInput | null>;
	onEmailChange: (value: string) => void;
	onPasswordChange: (value: string) => void;
	onNewPasswordChange: (value: string) => void;
	onConfirmationChange: (value: string) => void;
	onTogglePassword: () => void;
	onToggleNewPassword: () => void;
	onToggleConfirmation: () => void;
	onSubmitEditing: () => void;
};

export function LoginFields({
	token,
	recovery,
	email,
	password,
	newPassword,
	confirmation,
	showPassword,
	showNewPassword,
	showConfirmation,
	passwordInputRef,
	onEmailChange,
	onPasswordChange,
	onNewPasswordChange,
	onConfirmationChange,
	onTogglePassword,
	onToggleNewPassword,
	onToggleConfirmation,
	onSubmitEditing,
}: LoginFieldsProps) {
	if (token) {
		return (
			<View className="gap-5">
				<PasswordField
					label="Nova senha"
					placeholder="Digite sua nova senha"
					value={newPassword}
					onChangeText={onNewPasswordChange}
					visible={showNewPassword}
					onToggle={onToggleNewPassword}
				/>
				<PasswordField
					label="Confirme a nova senha"
					placeholder="Digite a senha novamente"
					value={confirmation}
					onChangeText={onConfirmationChange}
					visible={showConfirmation}
					onToggle={onToggleConfirmation}
				/>
			</View>
		);
	}

	return (
		<>
			<Text className="mb-2 text-sm font-bold text-[#101b35]">
				{recovery ? 'E-mail para recuperação' : 'E-mail'}
			</Text>
			<TextInput
				className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
				placeholder={recovery ? 'Digite seu e-mail' : 'seuemail@exemplo.com'}
				placeholderTextColor="#94a3b8"
				keyboardType="email-address"
				autoCapitalize="none"
				returnKeyType={recovery ? 'done' : 'next'}
				onSubmitEditing={onSubmitEditing}
				value={email}
				onChangeText={onEmailChange}
			/>
			{!recovery ? (
				<>
					<Text className="mb-2 mt-5 text-sm font-bold text-[#101b35]">
						Senha
					</Text>
					<PasswordField
						ref={passwordInputRef}
						placeholder="••••••••"
						value={password}
						onChangeText={onPasswordChange}
						visible={showPassword}
						onToggle={onTogglePassword}
						onSubmitEditing={onSubmitEditing}
					/>
				</>
			) : null}
		</>
	);
}
