import {
	useEffect,
	useRef,
	useState,
	type ComponentProps,
	type ComponentType,
} from 'react';
import {
	Platform,
	Pressable,
	Text,
	TextInput,
	View,
	useWindowDimensions,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { ApiError } from '../../../shared/services/publicApiClient';
import {
	login,
	requestPasswordRecovery,
	resetPassword,
	saveSession,
} from '../services/auth';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { LoginFields } from '../components/LoginFields';
import { LoginHero } from '../components/LoginHero';

type LoginError = {
	code: string;
	title: string;
	description: string;
	action: string;
};

function getLoginError(cause: unknown): LoginError {
	if (cause instanceof ApiError && cause.kind === 'network') {
		return {
			code: 'API_UNAVAILABLE',
			title: 'Não foi possível conectar',
			description: 'O serviço de acesso não respondeu.',
			action: 'Verifique sua conexão e tente novamente em instantes.',
		};
	}

	if (cause instanceof ApiError && cause.status === 401) {
		return {
			code: 'INVALID_CREDENTIALS',
			title: 'E-mail ou senha incorretos',
			description: 'Não foi possível validar suas credenciais.',
			action: 'Confira os dados informados e tente novamente.',
		};
	}

	if (cause instanceof ApiError && cause.status === 403) {
		return {
			code: 'ACCESS_DENIED',
			title: 'Acesso não autorizado',
			description: cause.message,
			action: 'Entre em contato com o administrador do sistema.',
		};
	}

	if (cause instanceof ApiError && cause.status === 422) {
		return {
			code: 'INVALID_LOGIN_DATA',
			title: 'Dados de acesso inválidos',
			description: cause.message,
			action: 'Confira o formato do e-mail e tente novamente.',
		};
	}

	if (cause instanceof ApiError && cause.status && cause.status >= 500) {
		return {
			code: 'API_ERROR',
			title: 'Serviço temporariamente indisponível',
			description: 'A API encontrou um erro ao processar o login.',
			action: 'Tente novamente em instantes.',
		};
	}

	return {
		code: 'LOGIN_FAILED',
		title: 'Não foi possível entrar',
		description:
			cause instanceof Error ? cause.message : 'Ocorreu um erro inesperado.',
		action: 'Tente novamente. Se o problema continuar, contate o suporte.',
	};
}

export function LoginPage() {
	const router = useRouter();
	const { width } = useWindowDimensions();
	const isMobileLayout = width < 768;
	const passwordInputRef = useRef<TextInput>(null);
	const KeyboardContainer = (
		Platform.OS === 'web' ? View : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<LoginError | null>(null);
	const [loading, setLoading] = useState(false);
	const [recovery, setRecovery] = useState(false);
	const [token, setToken] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [message, setMessage] = useState('');
	const [redirecting, setRedirecting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [remember, setRemember] = useState(false);
	const [recoveryCooldown, setRecoveryCooldown] = useState(0);
	const contentClassName = `grow px-5 py-8 sm:px-6 md:px-[7.5%] md:py-5 ${token ? 'items-center justify-center' : 'flex-col justify-start gap-8 md:flex-row md:items-center md:justify-between'}`;
	const params = useLocalSearchParams<{
		access_token?: string;
		type?: string;
	}>();

	useEffect(() => {
		if (params.type === 'recovery' && params.access_token)
			setToken(params.access_token);
		if (typeof window !== 'undefined' && window.location.hash) {
			const hashParams = new URLSearchParams(window.location.hash.slice(1));
			if (
				hashParams.get('type') === 'recovery' &&
				hashParams.get('access_token')
			)
				setToken(hashParams.get('access_token') ?? '');
		}
	}, [params.access_token, params.type]);
	useEffect(() => {
		if (!recoveryCooldown) return;
		const timer = setInterval(
			() => setRecoveryCooldown((value) => Math.max(value - 1, 0)),
			1000,
		);
		return () => clearInterval(timer);
	}, [recoveryCooldown]);

	async function submit() {
		setError(null);
		setMessage('');
		if (token) {
			if (!newPassword || newPassword !== confirmation) {
				setError({
					code: 'PASSWORD_MISMATCH',
					title: 'As senhas não coincidem',
					description: 'A confirmação precisa ser igual à nova senha.',
					action: 'Confira os campos e tente novamente.',
				});
				return;
			}
			setLoading(true);
			try {
				setMessage(
					(await resetPassword(token, newPassword, confirmation)).message,
				);
				setRedirecting(true);
				setTimeout(() => router.replace('/login' as never), 1500);
			} catch (cause) {
				setError(getLoginError(cause));
			} finally {
				setLoading(false);
			}
			return;
		}
		if (recovery) {
			if (recoveryCooldown) return;
			if (!email.trim()) {
				setError({
					code: 'EMAIL_REQUIRED',
					title: 'Informe seu e-mail',
					description: 'Precisamos do e-mail para localizar sua conta.',
					action: 'Digite seu e-mail e tente novamente.',
				});
				return;
			}
			setLoading(true);
			try {
				setMessage((await requestPasswordRecovery(email.trim())).message);
				setRecoveryCooldown(15);
			} catch (cause) {
				setError(getLoginError(cause));
			} finally {
				setLoading(false);
			}
			return;
		}
		if (!email.trim() || !password) {
			setError({
				code: 'CREDENTIALS_REQUIRED',
				title: 'Preencha seus dados de acesso',
				description: 'E-mail e senha são necessários para entrar.',
				action: 'Confira os campos e tente novamente.',
			});
			return;
		}
		setLoading(true);
		try {
			saveSession(await login(email.trim(), password), remember);
			router.replace('/dashboard' as never);
		} catch (cause) {
			setError(getLoginError(cause));
		} finally {
			setLoading(false);
		}
	}

	function startRecovery() {
		setEmail('');
		setPassword('');
		setError(null);
		setMessage('');
		setRecovery(true);
	}
	function returnToLogin() {
		setRecovery(false);
		setEmail('');
		setError(null);
		setMessage('');
	}
	return (
		<KeyboardContainer
			className={
				Platform.OS === 'web'
					? 'min-h-screen flex-1 overflow-y-auto bg-[#dceeff]'
					: 'flex-1 bg-[#dceeff]'
			}
			{...(Platform.OS === 'web'
				? {}
				: {
						bottomOffset: 20,
						keyboardShouldPersistTaps: 'handled',
						contentContainerClassName: 'grow',
					})}
		>
			<DecorativeBackground />
			<View className={`z-10 flex-1 ${contentClassName}`}>
				{!token ? (
					<LoginHero showRequestServiceButton={!isMobileLayout} />
				) : null}
				<View className="w-full items-center justify-center md:w-[46%] md:py-0">
					<View className="w-full max-w-[450px] rounded-[28px] border border-white/80 bg-white/90 px-5 py-6 shadow-2xl shadow-[#173a68]/15 sm:px-9 sm:py-8">
						<View className="mb-6">
							<Text className="text-[26px] font-extrabold tracking-[-0.8px] text-[#101b35]">
								{token ? 'Crie uma nova senha' : 'Acesse sua conta'}
							</Text>
							<Text className="mt-1 text-sm text-[#506481]">
								{token
									? 'Defina uma nova senha para continuar.'
									: 'Bem-vindo de volta.'}
							</Text>
						</View>
						<LoginFields
							token={token}
							recovery={recovery}
							email={email}
							password={password}
							newPassword={newPassword}
							confirmation={confirmation}
							showPassword={showPassword}
							showNewPassword={showNewPassword}
							showConfirmation={showConfirmation}
							passwordInputRef={passwordInputRef}
							onEmailChange={setEmail}
							onPasswordChange={setPassword}
							onNewPasswordChange={setNewPassword}
							onConfirmationChange={setConfirmation}
							onTogglePassword={() => setShowPassword(!showPassword)}
							onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
							onToggleConfirmation={() =>
								setShowConfirmation(!showConfirmation)
							}
							onSubmitEditing={
								recovery ? submit : () => passwordInputRef.current?.focus()
							}
						/>
						{!recovery && !token ? (
							<View className="mb-6 mt-5 flex-row flex-wrap items-center justify-between gap-y-4">
								<Pressable
									className="flex-row items-center gap-3"
									accessibilityRole="checkbox"
									accessibilityState={{ checked: remember }}
									onPress={() => setRemember(!remember)}
								>
									<View
										className={`h-6 w-6 items-center justify-center rounded-md border-2 ${remember ? 'border-sky-500 bg-sky-400' : 'border-sky-300 bg-white'}`}
									>
										{remember ? (
											<Check color="#ffffff" size={16} strokeWidth={3} />
										) : null}
									</View>
									<Text className="text-sm text-[#52647e]">Lembrar-me</Text>
								</Pressable>
								<Pressable onPress={startRecovery}>
									<Text className="text-xs font-bold text-[#176ed0]">
										Esqueci minha senha
									</Text>
								</Pressable>
							</View>
						) : null}
						{error ? (
							<View
								className="mb-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
								accessibilityRole="alert"
								accessibilityLiveRegion="assertive"
							>
								<Text className="text-[10px] font-bold uppercase tracking-wider text-red-700">
									{error.code}
								</Text>
								<Text className="mt-1 text-sm font-bold text-red-900">
									{error.title}
								</Text>
								<Text className="mt-1 text-sm text-red-800">
									{error.description}
								</Text>
								<Text className="mt-2 text-xs text-red-700">
									{error.action}
								</Text>
							</View>
						) : null}
						<Pressable
							className={`h-12 items-center justify-center rounded-full bg-[#2d83cd] shadow-md shadow-blue-600/30 ${token ? 'mt-3' : recovery ? 'mt-6' : ''}`}
							disabled={loading || redirecting || Boolean(recoveryCooldown)}
							onPress={submit}
						>
							<Text className="font-bold text-white">
								{redirecting
									? 'REDIRECIONANDO...'
									: loading
										? 'AGUARDE...'
										: token
											? 'ATUALIZAR SENHA'
											: recoveryCooldown
												? `AGUARDE ${recoveryCooldown}s`
												: recovery
													? 'ENVIAR LINK'
													: 'ENTRAR'}
							</Text>
						</Pressable>
						{!recovery && !token && isMobileLayout ? (
							<View className="mt-5">
								<View className="mb-4 flex-row items-center gap-3">
									<View className="h-px flex-1 bg-[#d7e2ef]" />
									<Text className="text-xs font-medium text-[#7b8da7]">ou</Text>
									<View className="h-px flex-1 bg-[#d7e2ef]" />
								</View>
								<Link href="/solicitar-servico" asChild>
									<Pressable className="h-12 items-center justify-center rounded-full border border-[#2d83cd]/40 bg-white/70">
										<Text className="font-bold text-[#176ed0]">
											Solicitar serviço
										</Text>
									</Pressable>
								</Link>
							</View>
						) : null}
						{recovery ? (
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
			</View>
		</KeyboardContainer>
	);
}
