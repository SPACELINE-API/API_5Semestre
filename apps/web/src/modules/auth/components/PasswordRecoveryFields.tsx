import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

type PasswordRecoveryFieldsProps = {
	password: string;
	passwordConfirmation: string;
	onPasswordChange: (value: string) => void;
	onPasswordConfirmationChange: (value: string) => void;
};

export function PasswordRecoveryFields({
	password,
	passwordConfirmation,
	onPasswordChange,
	onPasswordConfirmationChange,
}: PasswordRecoveryFieldsProps) {
	const [showPassword, setShowPassword] = useState(false);
	const [showPasswordConfirmation, setShowPasswordConfirmation] =
		useState(false);

	return (
		<View className="gap-5">
			<View>
				<Text className="mb-2 text-sm font-bold text-[#101b35]">
					Nova senha
				</Text>
				<View className="relative">
					<TextInput
						className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 pr-14 text-sm text-[#12233c]"
						placeholder="Digite sua nova senha"
						placeholderTextColor="#94a3b8"
						secureTextEntry={!showPassword}
						value={password}
						onChangeText={onPasswordChange}
					/>
					<Pressable
						className="absolute inset-y-0 right-0 w-14 items-center justify-center"
						accessibilityRole="button"
						accessibilityLabel={
							showPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'
						}
						onPress={() => setShowPassword((visible) => !visible)}
					>
						{showPassword ? (
							<EyeOff color="#64748b" size={20} />
						) : (
							<Eye color="#64748b" size={20} />
						)}
					</Pressable>
				</View>
			</View>
			<View>
				<Text className="mb-2 text-sm font-bold text-[#101b35]">
					Confirme a nova senha
				</Text>
				<View className="relative">
					<TextInput
						className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 pr-14 text-sm text-[#12233c]"
						placeholder="Digite a senha novamente"
						placeholderTextColor="#94a3b8"
						secureTextEntry={!showPasswordConfirmation}
						value={passwordConfirmation}
						onChangeText={onPasswordConfirmationChange}
					/>
					<Pressable
						className="absolute inset-y-0 right-0 w-14 items-center justify-center"
						accessibilityRole="button"
						accessibilityLabel={
							showPasswordConfirmation
								? 'Ocultar confirmação da senha'
								: 'Mostrar confirmação da senha'
						}
						onPress={() => setShowPasswordConfirmation((visible) => !visible)}
					>
						{showPasswordConfirmation ? (
							<EyeOff color="#64748b" size={20} />
						) : (
							<Eye color="#64748b" size={20} />
						)}
					</Pressable>
				</View>
			</View>
		</View>
	);
}
