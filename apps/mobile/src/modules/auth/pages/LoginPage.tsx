import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	acceptCookies,
	hasAcceptedCookies,
	login,
	requestPasswordRecovery,
	resetPassword,
	saveSession,
} from '../services/auth';
import { CookieConsentModal } from '../components/CookieConsentModal';
import { DecorativeBackground } from '../components/DecorativeBackground';
import { PasswordField } from '../components/PasswordField';

export function LoginPage() {
	const router = useRouter();
	const passwordInputRef = useRef<TextInput>(null);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
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
	const [cookiesAccepted, setCookiesAccepted] = useState(true);
	const [showCookieModal, setShowCookieModal] = useState(false);
	const [recoveryCooldown, setRecoveryCooldown] = useState(0);
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
		const accepted = hasAcceptedCookies();
		setCookiesAccepted(accepted);
		setShowCookieModal(!accepted);
	}, []);
	useEffect(() => {
		if (!recoveryCooldown) return;
		const timer = setInterval(
			() => setRecoveryCooldown((value) => Math.max(value - 1, 0)),
			1000,
		);
		return () => clearInterval(timer);
	}, [recoveryCooldown]);

	async function submit() {
		if (!cookiesAccepted) return;
		setError('');
		setMessage('');
		if (token) {
			if (!newPassword || newPassword !== confirmation) {
				setError('As senhas não coincidem.');
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
				setError(
					cause instanceof Error
						? cause.message
						: 'Não foi possível atualizar a senha.',
				);
			} finally {
				setLoading(false);
			}
			return;
		}
		if (recovery) {
			if (recoveryCooldown) return;
			if (!email.trim()) {
				setError('Digite o e-mail para recuperar sua senha.');
				return;
			}
			setLoading(true);
			try {
				setMessage((await requestPasswordRecovery(email.trim())).message);
				setRecoveryCooldown(15);
			} catch (cause) {
				setError(
					cause instanceof Error
						? cause.message
						: 'Não foi possível enviar o link.',
				);
			} finally {
				setLoading(false);
			}
			return;
		}
		if (!email.trim() || !password) {
			setError('Informe seu e-mail e sua senha.');
			return;
		}
		setLoading(true);
		try {
			saveSession(await login(email.trim(), password), remember);
			router.replace('/dashboard' as never);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : 'Não foi possível entrar.',
			);
		} finally {
			setLoading(false);
		}
	}

	function startRecovery() {
		setEmail('');
		setPassword('');
		setError('');
		setMessage('');
		setRecovery(true);
	}
	function returnToLogin() {
		setRecovery(false);
		setEmail('');
		setError('');
		setMessage('');
	}
	function acceptCookieConsent() {
		acceptCookies();
		setCookiesAccepted(true);
		setShowCookieModal(false);
	}
	function declineCookieConsent() {
		setCookiesAccepted(false);
		setShowCookieModal(false);
	}

	return (
		<View className="min-h-screen flex-1 overflow-hidden bg-[#dceeff]">
			<DecorativeBackground />
			<View
				className={`z-10 flex-1 px-6 py-6 md:px-[7.5%] md:py-5 ${token ? 'items-center justify-center' : 'flex-col justify-center md:flex-row md:items-center md:justify-between'}`}
			>
				{!token ? (
					<View className="flex-1 justify-center py-8 md:py-2">
						<View className="max-w-xl">
							<View className="mb-7 self-start rounded-full border border-[#2f86d1]/35 bg-white/70 px-4 py-1.5">
								<Text className="text-[11px] font-bold tracking-[2px] text-[#2478c2]">
									• PORTAL DO CLIENTE
								</Text>
							</View>
							<Text className="text-5xl font-extrabold leading-[1.03] tracking-[-1.5px] text-[#101b35] sm:text-6xl">
								Traduções com{`\n`}
								<Text className="text-[#2783d4]">clareza</Text>, prazo e{`\n`}
								controle.
							</Text>
							<Text className="mt-6 max-w-md text-base leading-6 text-[#506481] sm:text-lg">
								Gerencie pedidos, acompanhe orçamentos e fale com a equipe sem
								perder o histórico.
							</Text>
						</View>
					</View>
				) : null}
				<View className="w-full items-center justify-center py-6 md:w-[46%] md:py-0">
					<View className="w-full max-w-[450px] rounded-[28px] border border-white/80 bg-white/90 px-6 py-7 shadow-2xl shadow-[#173a68]/15 sm:px-9 sm:py-8">
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
						{token ? (
							<View className="gap-5">
								<PasswordField
									label="Nova senha"
									placeholder="Digite sua nova senha"
									value={newPassword}
									onChangeText={setNewPassword}
									visible={showNewPassword}
									onToggle={() => setShowNewPassword(!showNewPassword)}
								/>
								<PasswordField
									label="Confirme a nova senha"
									placeholder="Digite a senha novamente"
									value={confirmation}
									onChangeText={setConfirmation}
									visible={showConfirmation}
									onToggle={() => setShowConfirmation(!showConfirmation)}
								/>
							</View>
						) : (
							<>
								<Text className="mb-2 text-sm font-bold text-[#101b35]">
									{recovery ? 'E-mail para recuperação' : 'E-mail'}
								</Text>
								<TextInput
									className="h-11 rounded-xl border border-[#c7dced] bg-[#f7fbff] px-4 text-sm text-[#12233c]"
									placeholder={
										recovery ? 'Digite seu e-mail' : 'seuemail@exemplo.com'
									}
									placeholderTextColor="#94a3b8"
									keyboardType="email-address"
									autoCapitalize="none"
									returnKeyType={recovery ? 'done' : 'next'}
									onSubmitEditing={() =>
										recovery ? submit() : passwordInputRef.current?.focus()
									}
									value={email}
									onChangeText={setEmail}
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
											onChangeText={setPassword}
											visible={showPassword}
											onToggle={() => setShowPassword(!showPassword)}
											onSubmitEditing={submit}
										/>
									</>
								) : null}
							</>
						)}
						{!recovery && !token ? (
							<View className="mb-6 mt-5 flex-row items-center justify-between">
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
							<Text className="mb-4 mt-4 text-sm text-red-600">{error}</Text>
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
			{showCookieModal ? (
				<CookieConsentModal
					onAccept={acceptCookieConsent}
					onDecline={declineCookieConsent}
				/>
			) : null}
		</View>
	);
}
