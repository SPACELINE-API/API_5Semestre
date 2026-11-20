import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Linking,
	Pressable,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
	Check,
	CheckCircle2,
	Clock3,
	FileText,
	Link2Off,
	XCircle,
} from 'lucide-react-native';
import logoAlianca from '../../../shared/assets/logo-alianca.png';
import { ApiError } from '../../../shared/services/publicApiClient';
import { LoginScroll } from '../../auth/components/LoginScroll';
import {
	customerQuoteTermsUrl,
	decideCustomerQuote,
	getCustomerQuote,
	type CustomerQuote,
} from '../services/customerQuoteService';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type LoadState =
	| { kind: 'loading' }
	| { kind: 'ready'; quote: CustomerQuote }
	| { kind: 'invalid' }
	| { kind: 'error'; message: string };

function formatBRL(value: string | number | null) {
	return Number(value ?? 0).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}

function formatDay(value: string | null) {
	if (!value) return '-';
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			});
}

function StatusNotice({ quote }: { quote: CustomerQuote }) {
	const themeColors = useThemeColors();
	if (quote.status === 'approved') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4">
				<CheckCircle2 size={20} color={themeColors.successText} />
				<Text className="flex-1 font-inter text-sm leading-5 text-success-text">
					Orçamento aprovado em {formatDay(quote.approved_at)}. Você receberá o
					comprovante comercial por e-mail.
				</Text>
			</View>
		);
	}
	if (quote.status === 'reproved') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
				<XCircle size={20} color={themeColors.danger} />
				<Text className="flex-1 font-inter text-sm leading-5 text-danger-text">
					Orçamento reprovado em {formatDay(quote.reproved_at)}.
					{quote.reproval_reason ? ` Motivo: ${quote.reproval_reason}` : ''}
				</Text>
			</View>
		);
	}
	if (quote.status === 'cancelled') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-border bg-surface-subtle p-4">
				<Clock3 size={20} color={themeColors.foregroundSecondary} />
				<Text className="flex-1 font-inter text-sm leading-5 text-foreground-secondary">
					O prazo de validade deste orçamento expirou e ele foi cancelado. Entre
					em contato com a Aliança Traduções para receber um novo orçamento.
				</Text>
			</View>
		);
	}
	return null;
}

export function CustomerQuoteApprovalPage() {
	const themeColors = useThemeColors();
	const { token } = useLocalSearchParams<{ token?: string }>();
	const [state, setState] = useState<LoadState>({ kind: 'loading' });
	const [mode, setMode] = useState<'choose' | 'approve' | 'reprove'>('choose');
	const [reloadKey, setReloadKey] = useState(0);
	const [reason, setReason] = useState('');
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [actionError, setActionError] = useState('');

	useEffect(() => {
		if (!token) {
			setState({ kind: 'invalid' });
			return;
		}
		let active = true;
		setState({ kind: 'loading' });
		getCustomerQuote(token)
			.then((quote) => {
				if (active) setState({ kind: 'ready', quote });
			})
			.catch((error: unknown) => {
				if (!active) return;
				if (error instanceof ApiError && error.status === 404) {
					setState({ kind: 'invalid' });
					return;
				}
				setState({
					kind: 'error',
					message:
						'Não foi possível carregar o orçamento. Tente novamente em instantes.',
				});
			});
		return () => {
			active = false;
		};
	}, [token, reloadKey]);

	function toggleTerms() {
		setTermsAccepted((current) => !current);
		setActionError('');
	}

	function openTerms() {
		if (token) void Linking.openURL(customerQuoteTermsUrl(token));
	}

	async function decide(approved: boolean) {
		if (!token) return;
		if (!approved && !reason.trim()) {
			setActionError('Informe o motivo da reprovação.');
			return;
		}
		if (approved && !termsAccepted) {
			setActionError('Aceite os termos e condições para aprovar o orçamento.');
			return;
		}
		setSubmitting(true);
		setActionError('');
		try {
			const quote = await decideCustomerQuote(
				token,
				approved
					? { status: 'approved', terms_accepted: true }
					: { status: 'reproved', reproval_reason: reason.trim() },
			);
			setState({ kind: 'ready', quote });
			setMode('choose');
		} catch (error) {
			setActionError(
				error instanceof ApiError
					? error.message
					: 'Não foi possível registrar a sua resposta. Tente novamente.',
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<LoginScroll>
			<View className="flex-1 items-center bg-background px-4 py-10">
				<View className="w-full max-w-[640px] gap-6 rounded-2xl bg-surface p-6 md:p-8">
					<View className="items-center border-b border-border-subtle pb-5">
						<Image
							source={logoAlianca}
							style={{ width: 180, height: 60 }}
							resizeMode="contain"
							accessibilityLabel="Aliança Traduções"
						/>
					</View>

					{state.kind === 'loading' ? (
						<View className="items-center gap-3 py-10">
							<ActivityIndicator color="#d71920" />
							<Text className="font-inter text-sm text-foreground-muted">
								Carregando orçamento...
							</Text>
						</View>
					) : null}

					{state.kind === 'invalid' ? (
						<View className="items-center gap-3 py-6">
							<Link2Off size={32} color={themeColors.foregroundMuted} />
							<Text className="font-inter-bold text-lg text-foreground">
								Link inválido
							</Text>
							<Text className="text-center font-inter text-sm leading-5 text-foreground-secondary">
								Este link não é mais válido. Se o orçamento foi atualizado, use
								o link do e-mail mais recente.
							</Text>
						</View>
					) : null}

					{state.kind === 'error' ? (
						<View className="items-center gap-4 py-6">
							<Text className="text-center font-inter text-sm text-danger">
								{state.message}
							</Text>
							<TouchableOpacity
								accessibilityRole="button"
								onPress={() => setReloadKey((current) => current + 1)}
								className="rounded-lg border border-border-strong px-4 py-2.5"
							>
								<Text className="font-inter-medium text-sm text-foreground-secondary">
									Tentar novamente
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					{state.kind === 'ready' ? (
						<>
							<View className="gap-1">
								<View className="flex-row items-center gap-2">
									<FileText size={18} color="#d71920" />
									<Text className="font-inter-bold text-xl text-foreground">
										Orçamento #{state.quote.code}
									</Text>
								</View>
								{state.quote.company_name ? (
									<Text className="font-inter text-sm text-foreground-secondary">
										{state.quote.company_name}
									</Text>
								) : null}
							</View>

							{state.quote.status === 'pending' ? (
								<Text className="font-inter text-sm leading-5 text-foreground-secondary">
									{state.quote.customer_name
										? `Olá, ${state.quote.customer_name}. `
										: ''}
									Confira os itens e os valores abaixo e responda se aprova ou
									reprova este orçamento.
								</Text>
							) : null}

							<StatusNotice quote={state.quote} />

							<View className="gap-2">
								{state.quote.items.map((item, index) => (
									<View
										key={`item-${index}`}
										className="flex-row items-start justify-between gap-3 border-b border-border-subtle pb-2"
									>
										<View className="flex-1">
											<Text className="font-inter-medium text-sm text-foreground">
												{item.document_type || 'Tradução de documento'}
											</Text>
											<Text className="font-inter text-xs text-foreground-muted">
												{item.source_language} → {item.target_language}
											</Text>
										</View>
										<Text className="font-inter-medium text-sm text-foreground">
											{formatBRL(item.estimated_value)}
										</Text>
									</View>
								))}
								{state.quote.additional_services.map((service, index) => (
									<View
										key={`service-${index}`}
										className="flex-row items-start justify-between gap-3 border-b border-border-subtle pb-2"
									>
										<View className="flex-1">
											<Text className="font-inter-medium text-sm text-foreground">
												{service.description}
											</Text>
											<Text className="font-inter text-xs text-foreground-muted">
												Serviço adicional
											</Text>
										</View>
										<Text className="font-inter-medium text-sm text-foreground">
											{formatBRL(service.price)}
										</Text>
									</View>
								))}
								<View className="flex-row items-center justify-between pt-1">
									<Text className="font-inter-bold text-base text-foreground">
										Valor total
									</Text>
									<Text className="font-inter-bold text-base text-foreground">
										{formatBRL(state.quote.total_value)}
									</Text>
								</View>
							</View>

							{state.quote.status === 'pending' ? (
								<>
									<View className="rounded-lg bg-warning-soft p-3">
										<Text className="font-inter-medium text-sm text-warning-text">
											Válido até {formatDay(state.quote.valid_until)}. Depois
											dessa data, o orçamento é cancelado automaticamente.
										</Text>
									</View>

									{mode === 'reprove' ? (
										<View className="gap-3">
											<TextInput
												accessibilityLabel="Motivo da reprovação"
												value={reason}
												onChangeText={(value) => {
													setReason(value);
													setActionError('');
												}}
												maxLength={500}
												multiline
												textAlignVertical="top"
												placeholder="Conte o motivo da reprovação"
												placeholderTextColor={themeColors.foregroundSubtle}
												className="min-h-24 rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
											/>
											<View className="flex-row flex-wrap gap-3">
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => void decide(false)}
													className={`rounded-lg px-4 py-3 ${submitting ? 'bg-border-strong' : 'bg-danger'}`}
												>
													<Text className="font-inter-medium text-sm text-primary-foreground">
														{submitting
															? 'Enviando...'
															: 'Confirmar reprovação'}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => setMode('choose')}
													className="rounded-lg border border-border-strong px-4 py-3"
												>
													<Text className="font-inter-medium text-sm text-foreground-secondary">
														Voltar
													</Text>
												</TouchableOpacity>
											</View>
										</View>
									) : mode === 'approve' ? (
										<View className="gap-3 rounded-lg border border-success/30 bg-success-soft p-4">
											<Text className="font-inter-medium text-sm leading-5 text-success-text">
												Confirma a aprovação do orçamento #{state.quote.code} no
												valor de {formatBRL(state.quote.total_value)}? Depois de
												aprovado, iniciamos o serviço e enviamos o comprovante
												comercial por e-mail.
											</Text>
											<View className="flex-row items-start gap-2.5">
												<Pressable
													accessibilityRole="checkbox"
													accessibilityLabel="Li e aceito os termos e condições deste orçamento"
													accessibilityState={{ checked: termsAccepted }}
													aria-checked={termsAccepted}
													testID="customer-quote-terms-checkbox"
													hitSlop={6}
													onPress={toggleTerms}
													className={`mt-0.5 h-[20px] w-[20px] items-center justify-center rounded border-[1.5px] ${termsAccepted ? 'border-success bg-success' : 'border-border-strong bg-surface'}`}
												>
													{termsAccepted ? (
														<Check
															color={themeColors.primaryForeground}
															size={13}
															strokeWidth={3}
														/>
													) : null}
												</Pressable>
												<Text className="flex-1 font-inter text-sm leading-5 text-foreground">
													<Text onPress={toggleTerms}>Li e aceito os </Text>
													<Text
														accessibilityRole="link"
														onPress={openTerms}
														className="font-inter-medium text-primary-text underline"
													>
														termos e condições
													</Text>
													<Text onPress={toggleTerms}> deste orçamento.</Text>
												</Text>
											</View>
											<View className="flex-row flex-wrap gap-3">
												<TouchableOpacity
													accessibilityRole="button"
													accessibilityState={{
														disabled: submitting || !termsAccepted,
													}}
													disabled={submitting || !termsAccepted}
													onPress={() => void decide(true)}
													className={`rounded-lg px-4 py-3 ${submitting || !termsAccepted ? 'bg-border-strong' : 'bg-success'}`}
												>
													<Text className="font-inter-medium text-sm text-primary-foreground">
														{submitting ? 'Enviando...' : 'Confirmar aprovação'}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => setMode('choose')}
													className="rounded-lg border border-border-strong bg-surface px-4 py-3"
												>
													<Text className="font-inter-medium text-sm text-foreground-secondary">
														Voltar
													</Text>
												</TouchableOpacity>
											</View>
										</View>
									) : (
										<View className="flex-row flex-wrap gap-3">
											<TouchableOpacity
												accessibilityRole="button"
												onPress={() => {
													setActionError('');
													setTermsAccepted(false);
													setMode('approve');
												}}
												className="min-w-[160px] flex-1 items-center rounded-lg bg-success px-4 py-3"
											>
												<Text className="font-inter-medium text-sm text-primary-foreground">
													Aprovar orçamento
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												accessibilityRole="button"
												onPress={() => {
													setActionError('');
													setMode('reprove');
												}}
												className="min-w-[160px] flex-1 items-center rounded-lg border border-danger/30 px-4 py-3"
											>
												<Text className="font-inter-medium text-sm text-danger">
													Reprovar orçamento
												</Text>
											</TouchableOpacity>
										</View>
									)}
								</>
							) : null}

							{actionError ? (
								<Text className="font-inter text-sm text-danger">
									{actionError}
								</Text>
							) : null}
						</>
					) : null}
				</View>
			</View>
		</LoginScroll>
	);
}
