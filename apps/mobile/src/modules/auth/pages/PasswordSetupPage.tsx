import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	CheckCircle2,
	Circle,
	Clock3,
	Link2Off,
	MailCheck,
	ShieldCheck,
} from 'lucide-react-native';
import logoAlianca from '../../../shared/assets/logo-alianca.png';
import { ApiError } from '../../../shared/services/publicApiClient';
import { GradientButton } from '../components/GradientButton';
import { LoginBackground } from '../components/LoginBackground';
import { LoginScroll } from '../components/LoginScroll';
import { PasswordField } from '../components/PasswordField';
import {
	definePassword,
	getPasswordSetupLink,
	type PasswordSetupLinkInfo,
} from '../services/passwordSetup';

const MIN_PASSWORD_LENGTH = 6;

type LoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; info: PasswordSetupLinkInfo }
	| {
			kind: 'blocked';
			reason: 'invalido' | 'aceito' | 'rejeitado' | 'expirado';
	  }
	| { kind: 'error'; message: string };

const BLOCKED_COPY = {
	invalido: {
		title: 'Link inválido',
		text: 'Não encontramos este link. Confira se o endereço foi copiado por completo ou peça um novo envio ao administrador.',
		Icon: Link2Off,
	},
	aceito: {
		title: 'Este link já foi utilizado',
		text: 'A senha desta conta já foi definida. Entre normalmente com o seu e-mail e a sua senha.',
		Icon: MailCheck,
	},
	rejeitado: {
		title: 'Este link foi substituído',
		text: 'Um novo link foi enviado para o seu e-mail. Use o mais recente para definir a sua senha.',
		Icon: Link2Off,
	},
	expirado: {
		title: 'Este link expirou',
		text: 'O prazo de 3 dias para definir a senha terminou. Peça ao administrador o reenvio do link.',
		Icon: Clock3,
	},
} as const;

function passwordStrength(password: string) {
	if (!password) return 0;
	let score = 0;
	if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
	if (password.length >= 12) score += 1;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
	if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
	return score;
}

const STRENGTH_LABELS = ['', 'Fraca', 'Razoável', 'Boa', 'Forte'];
const STRENGTH_COLORS = ['#d5e3f1', '#ef4444', '#f59e0b', '#2d83cd', '#10b981'];

function Requirement({ met, label }: { met: boolean; label: string }) {
	return (
		<View className="flex-row items-center gap-2">
			{met ? (
				<CheckCircle2 size={16} color="#10b981" />
			) : (
				<Circle size={16} color="#94a3b8" />
			)}
			<Text
				className={`text-[13px] ${met ? 'font-semibold text-emerald-700' : 'text-[#52647e]'}`}
			>
				{label}
			</Text>
		</View>
	);
}

function StatusCard({
	title,
	text,
	Icon,
	tone,
	children,
}: {
	title: string;
	text: string;
	Icon: typeof Link2Off;
	tone: 'blue' | 'green';
	children?: React.ReactNode;
}) {
	const isGreen = tone === 'green';
	return (
		<View className="items-center">
			<View
				className={`mb-5 h-16 w-16 items-center justify-center rounded-full ${isGreen ? 'bg-emerald-50' : 'bg-[#eaf3fc]'}`}
			>
				<Icon size={30} color={isGreen ? '#059669' : '#2d83cd'} />
			</View>
			<Text className="text-center text-[24px] font-extrabold tracking-[-0.6px] text-[#0f1b33]">
				{title}
			</Text>
			<Text className="mb-6 mt-2 text-center text-sm leading-6 text-[#52647e]">
				{text}
			</Text>
			{children}
		</View>
	);
}

export function PasswordSetupPage() {
	const router = useRouter();
	const params = useLocalSearchParams<{ token?: string }>();
	const token = typeof params.token === 'string' ? params.token : '';
	const [state, setState] = useState<LoadState>({ kind: 'loading' });
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [formError, setFormError] = useState('');
	const [done, setDone] = useState(false);

	useEffect(() => {
		if (!token) {
			setState({ kind: 'blocked', reason: 'invalido' });
			return;
		}
		let active = true;
		getPasswordSetupLink(token)
			.then((info) => {
				if (!active) return;
				setState(
					info.status === 'pendente'
						? { kind: 'ready', info }
						: { kind: 'blocked', reason: info.status },
				);
			})
			.catch((cause: unknown) => {
				if (!active) return;
				if (cause instanceof ApiError && cause.status === 404) {
					setState({ kind: 'blocked', reason: 'invalido' });
					return;
				}
				setState({
					kind: 'error',
					message:
						cause instanceof Error
							? cause.message
							: 'Não foi possível validar o link.',
				});
			});
		return () => {
			active = false;
		};
	}, [token]);

	const lengthMet = password.length >= MIN_PASSWORD_LENGTH;
	const matchMet = confirmation.length > 0 && password === confirmation;
	const strength = passwordStrength(password);
	const canSubmit = lengthMet && matchMet && !submitting;

	async function submit() {
		if (!canSubmit) return;
		setFormError('');
		setSubmitting(true);
		try {
			await definePassword(token, password, confirmation);
			setDone(true);
			setTimeout(() => router.replace('/login' as never), 2500);
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 410) {
				const gone = cause.message.includes('utilizado')
					? 'aceito'
					: cause.message.includes('substitu')
						? 'rejeitado'
						: 'expirado';
				setState({ kind: 'blocked', reason: gone });
				return;
			}
			setFormError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível definir a senha. Tente novamente.',
			);
		} finally {
			setSubmitting(false);
		}
	}

	function renderCard() {
		if (state.kind === 'loading') {
			return (
				<View className="items-center py-10">
					<ActivityIndicator color="#2d83cd" />
					<Text className="mt-3 text-sm text-[#52647e]">
						Validando o seu link...
					</Text>
				</View>
			);
		}

		if (state.kind === 'error') {
			return (
				<StatusCard
					title="Algo deu errado"
					text={state.message}
					Icon={Link2Off}
					tone="blue"
				>
					<GradientButton
						label="TENTAR NOVAMENTE"
						onPress={() =>
							router.replace(`/definir-senha?token=${token}` as never)
						}
						className="w-full"
					/>
				</StatusCard>
			);
		}

		if (state.kind === 'blocked') {
			const copy = BLOCKED_COPY[state.reason];
			return (
				<StatusCard
					title={copy.title}
					text={copy.text}
					Icon={copy.Icon}
					tone="blue"
				>
					<GradientButton
						label="IR PARA O LOGIN"
						onPress={() => router.replace('/login' as never)}
						className="w-full"
					/>
				</StatusCard>
			);
		}

		if (done) {
			return (
				<StatusCard
					title="Senha definida!"
					text="Sua conta está ativa. Estamos levando você para o login."
					Icon={ShieldCheck}
					tone="green"
				>
					<GradientButton
						label="ENTRAR AGORA"
						onPress={() => router.replace('/login' as never)}
						className="w-full"
					/>
				</StatusCard>
			);
		}

		const greeting = state.info.name ? `Olá, ${state.info.name}!` : 'Olá!';

		return (
			<>
				<Text className="text-[28px] font-extrabold tracking-[-0.8px] text-[#0f1b33]">
					Crie sua senha
				</Text>
				<Text className="mb-5 mt-1 text-sm text-[#52647e]">
					{greeting} Defina a senha para ativar sua conta.
				</Text>
				{state.info.email ? (
					<View className="mb-5 rounded-xl border border-[#d5e3f1] bg-[#f5f9fd] px-4 py-3">
						<Text className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
							Conta
						</Text>
						<Text className="mt-0.5 text-sm font-semibold text-[#12233c]">
							{state.info.email}
						</Text>
					</View>
				) : null}
				<View className="gap-5">
					<PasswordField
						label="Nova senha"
						placeholder="Digite sua senha"
						value={password}
						onChangeText={setPassword}
						visible={showPassword}
						onToggle={() => setShowPassword(!showPassword)}
					/>
					<PasswordField
						label="Confirme a senha"
						placeholder="Digite a senha novamente"
						value={confirmation}
						onChangeText={setConfirmation}
						visible={showConfirmation}
						onToggle={() => setShowConfirmation(!showConfirmation)}
						onSubmitEditing={submit}
					/>
				</View>
				<View className="mt-4 gap-1.5">
					<View className="flex-row gap-1.5">
						{[1, 2, 3, 4].map((step) => (
							<View
								key={step}
								className="h-1.5 flex-1 rounded-full"
								style={{
									backgroundColor:
										step <= strength ? STRENGTH_COLORS[strength] : '#e3edf7',
								}}
							/>
						))}
					</View>
					<Text className="text-xs text-[#52647e]">
						{strength ? `Força da senha: ${STRENGTH_LABELS[strength]}` : ' '}
					</Text>
				</View>
				<View className="mb-5 mt-2 gap-2">
					<Requirement
						met={lengthMet}
						label={`Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`}
					/>
					<Requirement met={matchMet} label="As senhas coincidem" />
				</View>
				{formError ? (
					<View
						className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
						accessibilityRole="alert"
					>
						<Text className="text-sm font-bold text-red-900">
							Não foi possível definir a senha
						</Text>
						<Text className="mt-1 text-sm text-red-800">{formError}</Text>
					</View>
				) : null}
				<GradientButton
					label={submitting ? 'AGUARDE...' : 'ATIVAR MINHA CONTA'}
					onPress={submit}
					disabled={!canSubmit}
				/>
			</>
		);
	}

	return (
		<View
			className={
				Platform.OS === 'web'
					? 'min-h-screen flex-1 bg-[#f6faff]'
					: 'flex-1 bg-[#f6faff]'
			}
		>
			<LoginBackground />
			<LoginScroll>
				<View className="z-10 grow justify-center gap-8 px-6 py-8 sm:px-10 md:flex-row md:items-stretch md:justify-between md:gap-10 md:px-[7%] md:py-10">
					<View className="items-center md:flex-1 md:items-start md:justify-between md:py-1">
						<Image
							source={logoAlianca}
							style={{ width: 170, height: 44 }}
							resizeMode="contain"
							accessibilityLabel="Aliança Traduções"
						/>
						<View className="hidden max-w-[520px] md:flex">
							<Text className="text-[52px] font-extrabold leading-[1.05] tracking-[-1.5px] text-[#0f1b33]">
								Bem-vindo(a) à <Text className="text-[#2783d4]">equipe</Text>.
							</Text>
							<Text className="mt-6 max-w-[430px] text-lg leading-7 text-[#52647e]">
								Falta só um passo: crie a sua senha para acessar orçamentos,
								solicitações e documentos de tradução.
							</Text>
						</View>
						<View className="hidden h-11 md:flex" />
					</View>

					<View className="w-full self-center md:w-[46%] md:max-w-[480px] md:justify-center">
						<View className="w-full rounded-[22px] border border-[#e1ebf5] bg-white px-6 py-7 shadow-xl shadow-[#173a68]/10 sm:px-8">
							{renderCard()}
						</View>
					</View>
				</View>
			</LoginScroll>
		</View>
	);
}
