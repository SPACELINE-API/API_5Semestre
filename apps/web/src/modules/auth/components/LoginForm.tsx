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
		window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
	}
}

export function LoginForm({ cookiesAccepted }: LoginFormProps) {
	const router = useRouter();
	const passwordInputRef = useRef<TextInput>(null);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [recoveryAccessToken, setRecoveryAccessToken] = useState<string | null>(null);
	const [recoveryPassword, setRecoveryPassword] = useState('');
	const [recoveryPasswordConfirmation, setRecoveryPasswordConfirmation] = useState('');
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
			setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.');
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
			setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o link.');
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
			setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a senha.');
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
		<View className="w-full max-w-2xl gap-4">
			<View className="rounded-3xl border border-white/60 bg-white/20 px-6 py-8 shadow-lg shadow-slate-900/10 sm:px-12 sm:py-10">
				{!isPasswordRecovery ? (
					<>
						<Text className="mb-2 text-base font-bold text-white">
							{isRequestingRecovery ? 'E-mail para recuperação' : 'E-mail'}
						</Text>
						<TextInput
							className="h-14 rounded-xl border-2 border-white/70 bg-white/90 px-5 text-base text-slate-900"
							placeholder={isRequestingRecovery ? 'Digite seu e-mail' : 'seuemail@exemplo.com'}
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
								<Text className="mb-2 mt-6 text-base font-bold text-white">Senha</Text>
								<View className="relative">
									<TextInput
										ref={passwordInputRef}
										className="h-14 rounded-xl border-2 border-white/70 bg-white/90 px-5 pr-14 text-base text-slate-900"
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
										accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
				<View className="mb-7 mt-5 flex-row items-center justify-between">
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
							{remember ? <Check color="#ffffff" size={16} strokeWidth={3} /> : null}
						</View>
						<Text className="text-sm text-slate-600">Lembrar-me</Text>
					</Pressable>
					<Pressable onPress={beginPasswordRecovery}>
						<Text className="text-sm font-bold text-blue-600">
							Esqueci minha senha
						</Text>
					</Pressable>
				</View>
				) : null}
				{isRequestingRecovery ? (
					<Pressable className="mt-5 self-center" onPress={returnToLogin}>
						<Text className="text-sm font-bold text-blue-600">Voltar para o login</Text>
					</Pressable>
				) : null}
				{error ? <Text className="mb-4 text-sm text-red-600">{error}</Text> : null}
				{message ? <Text className="mb-4 text-sm text-blue-700">{message}</Text> : null}
				<Pressable
					className="h-14 items-center justify-center rounded-full bg-blue-600 shadow-md shadow-blue-600/30"
					disabled={loading}
					onPress={submitHandler}
				>
					<Text className="font-bold text-white">{submitLabel}</Text>
				</Pressable>
			</View>
		</View>
	);
}
