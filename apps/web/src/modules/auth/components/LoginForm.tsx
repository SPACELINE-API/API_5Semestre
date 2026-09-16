import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Eye, EyeOff } from 'lucide-react-native';
import {
	login,
	requestPasswordRecovery,
	resetPassword,
	saveSession,
} from '../services/auth';
import { PasswordRecoveryFields } from './PasswordRecoveryFields';

type LoginFormProps = {
	cookiesAccepted: boolean;
};

function getRecoveryAccessToken() {
	if (typeof window === 'undefined') {
		return null;
	}

	const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
	return params.get('type') === 'recovery' ? params.get('access_token') : null;
}

function clearRecoveryHash() {
	if (typeof window !== 'undefined') {
		window.history.replaceState(
			{},
			document.title,
			`${window.location.pathname}${window.location.search}`,
		);
	}
}

export function LoginForm({ cookiesAccepted }: LoginFormProps) {
	const router = useRouter();
	const passwordInputRef = useRef<TextInput>(null);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(
		null,
	);
	const [recoveryPassword, setRecoveryPassword] = useState('');
	const [recoveryPasswordConfirmation, setRecoveryPasswordConfirmation] =
		useState('');
	const [isRequestingRecovery, setIsRequestingRecovery] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [remember, setRemember] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		setRecoveryAccessToken(getRecoveryAccessToken());
	}, []);

	async function handleSubmit() {
		if (!cookiesAccepted) {
			return;
		}

		if (!email.trim() || !password) {
			setError('Informe seu e-mail e sua senha.');
			return;
		}
		setError('');
		setMessage('');
		setLoading(true);
		try {
			const session = await login(email.trim(), password);
			saveSession(session, remember);
			router.replace('/dashboard' as never);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : 'Não foi possível entrar.',
			);
		} finally {
			setLoading(false);
		}
	}

	function beginPasswordRecovery() {
		setEmail('');
		setPassword('');
		setError('');
		setMessage('');
		setIsRequestingRecovery(true);
	}

	function returnToLogin() {
		setIsRequestingRecovery(false);
		setEmail('');
		setError('');
		setMessage('');
	}

	async function handleRecoveryRequest() {
		if (!cookiesAccepted) {
			return;
		}

		if (!email.trim()) {
			setError('Digite o e-mail para recuperar sua senha.');
			return;
		}

		setError('');
		setMessage('');
		setLoading(true);
		try {
			const response = await requestPasswordRecovery(email.trim());
			setMessage(response.message);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível enviar o link.',
			);
		} finally {
			setLoading(false);
		}
	}

	async function handlePasswordReset() {
		if (!cookiesAccepted || !recoveryAccessToken) {
			return;
		}

		if (!recoveryPassword || !recoveryPasswordConfirmation) {
			setError('Informe a nova senha e a confirmação.');
			return;
		}

		if (recoveryPassword !== recoveryPasswordConfirmation) {
			setError('As senhas não coincidem.');
			return;
		}

		setError('');
		setMessage('');
		setLoading(true);
		try {
			const response = await resetPassword(
				recoveryAccessToken,
				recoveryPassword,
				recoveryPasswordConfirmation,
			);
			clearRecoveryHash();
			setRecoveryAccessToken(null);
			setRecoveryPassword('');
			setRecoveryPasswordConfirmation('');
			setMessage(response.message);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível atualizar a senha.',
			);
		} finally {
			setLoading(false);
		}
	}

	const isPasswordRecovery = Boolean(recoveryAccessToken);
	const submitHandler = isPasswordRecovery
		? handlePasswordReset
		: isRequestingRecovery
			? handleRecoveryRequest
			: handleSubmit;
	const submitLabel = isPasswordRecovery
		? 'ATUALIZAR SENHA'
		: isRequestingRecovery
			? 'ENVIAR LINK'
			: loading
				? 'ENTRANDO...'
				: 'ENTRAR';

	return (
		<View className="w-full max-w-[450px] gap-4">
			<View className="rounded-[28px] border border-white/80 bg-white/90 px-6 py-7 shadow-2xl shadow-[#173a68]/15 sm:px-9 sm:py-8">
				{isPasswordRecovery ? (
					<View className="mb-6">
						<Text className="text-[26px] font-extrabold tracking-[-0.8px] text-[#101b35]">
							Crie uma nova senha
						</Text>
						<Text className="mt-1 text-sm text-[#506481]">
							Defina uma nova senha para continuar.
						</Text>
					</View>
				) : (
					<View className="mb-6 flex-row items-start justify-between">
						<View>
							<Text className="text-[26px] font-extrabold tracking-[-0.8px] text-[#101b35]">
								Acesse sua conta
							</Text>
							<Text className="mt-1 text-sm text-[#506481]">
								Bem-vindo de volta.
							</Text>
						</View>
					</View>
				)}
				{!isPasswordRecovery ? (
					<>
						<Text className="mb-2 text-sm font-bold text-[#101b35]">
							{isRequestingRecovery ? 'E-mail para recuperação' : 'E-mail'}
						</Text>
						<TextInput
							className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
							placeholder={
								isRequestingRecovery
									? 'Digite seu e-mail'
									: 'seuemail@exemplo.com'
							}
							placeholderTextColor="#94a3b8"
							keyboardType="email-address"
							autoCapitalize="none"
							returnKeyType={isRequestingRecovery ? 'done' : 'next'}
							onSubmitEditing={() =>
								isRequestingRecovery
									? handleRecoveryRequest()
									: passwordInputRef.current?.focus()
							}
							value={email}
							onChangeText={setEmail}
						/>
						{!isRequestingRecovery ? (
							<>
								<Text className="mb-2 mt-5 text-sm font-bold text-[#101b35]">
									Senha
								</Text>
								<View className="relative">
									<TextInput
										ref={passwordInputRef}
										className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 pr-14 text-sm text-[#12233c]"
										placeholder="••••••••"
										placeholderTextColor="#94a3b8"
										secureTextEntry={!showPassword}
										returnKeyType="done"
										onSubmitEditing={handleSubmit}
										value={password}
										onChangeText={setPassword}
									/>
									<Pressable
										className="absolute inset-y-0 right-0 w-14 items-center justify-center"
										accessibilityRole="button"
										accessibilityLabel={
											showPassword ? 'Ocultar senha' : 'Mostrar senha'
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
							</>
						) : null}
					</>
				) : (
					<PasswordRecoveryFields
						password={recoveryPassword}
						passwordConfirmation={recoveryPasswordConfirmation}
						onPasswordChange={setRecoveryPassword}
						onPasswordConfirmationChange={setRecoveryPasswordConfirmation}
					/>
				)}
				{!isRequestingRecovery && !isPasswordRecovery ? (
					<View className="mb-6 mt-5 flex-row items-center justify-between">
						<Pressable
							className="flex-row items-center gap-3"
							accessibilityRole="checkbox"
							accessibilityLabel="Lembrar-me"
							accessibilityState={{ checked: remember }}
							onPress={() => setRemember(!remember)}
						>
							<View
								className={`h-6 w-6 rounded-md border-2 ${remember ? 'border-sky-500 bg-sky-400' : 'border-sky-300 bg-white'}`}
							>
								{remember ? (
									<Check color="#ffffff" size={16} strokeWidth={3} />
								) : null}
							</View>
							<Text className="text-sm text-[#52647e]">Lembrar-me</Text>
						</Pressable>
						<Pressable onPress={beginPasswordRecovery}>
							<Text className="text-xs font-bold text-[#176ed0]">
								Esqueci minha senha
							</Text>
						</Pressable>
					</View>
				) : null}
				{error ? (
					<Text className="mb-4 mt-4 text-sm text-red-600">{error}</Text>
				) : null}
				<Pressable
					className={`h-12 items-center justify-center rounded-full bg-[#2d83cd] shadow-md shadow-blue-600/30 ${isPasswordRecovery ? 'mt-3' : ''}`}
					disabled={loading}
					onPress={submitHandler}
				>
					<Text className="font-bold text-white">{submitLabel}</Text>
				</Pressable>
				{isRequestingRecovery ? (
					<Pressable
						className="mt-3 h-11 items-center justify-center rounded-full border border-[#2d83cd] bg-transparent"
						onPress={returnToLogin}
					>
						<Text className="text-sm font-bold text-[#176ed0]">
							Voltar para o login
						</Text>
					</Pressable>
				) : null}
				{message ? (
					<Text className="mt-5 text-center text-sm font-semibold text-emerald-600">
						{message}
					</Text>
				) : null}
			</View>
		</View>
	);
}
