import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
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
	decideCustomerQuote,
	getCustomerQuote,
	type CustomerQuote,
} from '../services/customerQuoteService';

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
	if (quote.status === 'approved') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
				<CheckCircle2 size={20} color="#047857" />
				<Text className="flex-1 font-inter text-sm leading-5 text-emerald-800">
					Orçamento aprovado em {formatDay(quote.approved_at)}. Você receberá o
					comprovante comercial por e-mail.
				</Text>
			</View>
		);
	}
	if (quote.status === 'reproved') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
				<XCircle size={20} color="#b91c1c" />
				<Text className="flex-1 font-inter text-sm leading-5 text-red-800">
					Orçamento reprovado em {formatDay(quote.reproved_at)}.
					{quote.reproval_reason ? ` Motivo: ${quote.reproval_reason}` : ''}
				</Text>
			</View>
		);
	}
	if (quote.status === 'cancelled') {
		return (
			<View className="flex-row items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
				<Clock3 size={20} color="#4b5563" />
				<Text className="flex-1 font-inter text-sm leading-5 text-gray-700">
					O prazo de validade deste orçamento expirou e ele foi cancelado. Entre
					em contato com a Aliança Traduções para receber um novo orçamento.
				</Text>
			</View>
		);
	}
	return null;
}

export function CustomerQuoteApprovalPage() {
	const { token } = useLocalSearchParams<{ token?: string }>();
	const [state, setState] = useState<LoadState>({ kind: 'loading' });
	const [mode, setMode] = useState<'choose' | 'approve' | 'reprove'>('choose');
	const [reloadKey, setReloadKey] = useState(0);
	const [reason, setReason] = useState('');
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

	async function decide(approved: boolean) {
		if (!token) return;
		if (!approved && !reason.trim()) {
			setActionError('Informe o motivo da reprovação.');
			return;
		}
		setSubmitting(true);
		setActionError('');
		try {
			const quote = await decideCustomerQuote(
				token,
				approved
					? { status: 'approved' }
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
			<View className="flex-1 items-center bg-[#f4f6fa] px-4 py-10">
				<View className="w-full max-w-[640px] gap-6 rounded-2xl bg-white p-6 md:p-8">
					<View className="items-center border-b border-gray-100 pb-5">
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
							<Text className="font-inter text-sm text-gray-500">
								Carregando orçamento...
							</Text>
						</View>
					) : null}

					{state.kind === 'invalid' ? (
						<View className="items-center gap-3 py-6">
							<Link2Off size={32} color="#6b7280" />
							<Text className="font-inter-bold text-lg text-gray-900">
								Link inválido
							</Text>
							<Text className="text-center font-inter text-sm leading-5 text-gray-600">
								Este link não é mais válido. Se o orçamento foi atualizado, use
								o link do e-mail mais recente.
							</Text>
						</View>
					) : null}

					{state.kind === 'error' ? (
						<View className="items-center gap-4 py-6">
							<Text className="text-center font-inter text-sm text-red-700">
								{state.message}
							</Text>
							<TouchableOpacity
								accessibilityRole="button"
								onPress={() => setReloadKey((current) => current + 1)}
								className="rounded-lg border border-gray-300 px-4 py-2.5"
							>
								<Text className="font-inter-medium text-sm text-gray-700">
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
									<Text className="font-inter-bold text-xl text-gray-900">
										Orçamento #{state.quote.code}
									</Text>
								</View>
								{state.quote.company_name ? (
									<Text className="font-inter text-sm text-gray-600">
										{state.quote.company_name}
									</Text>
								) : null}
							</View>

							{state.quote.status === 'pending' ? (
								<Text className="font-inter text-sm leading-5 text-gray-700">
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
										className="flex-row items-start justify-between gap-3 border-b border-gray-100 pb-2"
									>
										<View className="flex-1">
											<Text className="font-inter-medium text-sm text-gray-900">
												{item.document_type || 'Tradução de documento'}
											</Text>
											<Text className="font-inter text-xs text-gray-500">
												{item.source_language} → {item.target_language}
											</Text>
										</View>
										<Text className="font-inter-medium text-sm text-gray-900">
											{formatBRL(item.estimated_value)}
										</Text>
									</View>
								))}
								{state.quote.additional_services.map((service, index) => (
									<View
										key={`service-${index}`}
										className="flex-row items-start justify-between gap-3 border-b border-gray-100 pb-2"
									>
										<View className="flex-1">
											<Text className="font-inter-medium text-sm text-gray-900">
												{service.description}
											</Text>
											<Text className="font-inter text-xs text-gray-500">
												Serviço adicional
											</Text>
										</View>
										<Text className="font-inter-medium text-sm text-gray-900">
											{formatBRL(service.price)}
										</Text>
									</View>
								))}
								<View className="flex-row items-center justify-between pt-1">
									<Text className="font-inter-bold text-base text-gray-900">
										Valor total
									</Text>
									<Text className="font-inter-bold text-base text-gray-900">
										{formatBRL(state.quote.total_value)}
									</Text>
								</View>
							</View>

							{state.quote.status === 'pending' ? (
								<>
									<View className="rounded-lg bg-amber-50 p-3">
										<Text className="font-inter-medium text-sm text-amber-800">
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
												className="min-h-24 rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
											/>
											<View className="flex-row flex-wrap gap-3">
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => void decide(false)}
													className={`rounded-lg px-4 py-3 ${submitting ? 'bg-gray-300' : 'bg-red-600'}`}
												>
													<Text className="font-inter-medium text-sm text-white">
														{submitting
															? 'Enviando...'
															: 'Confirmar reprovação'}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => setMode('choose')}
													className="rounded-lg border border-gray-300 px-4 py-3"
												>
													<Text className="font-inter-medium text-sm text-gray-700">
														Voltar
													</Text>
												</TouchableOpacity>
											</View>
										</View>
									) : mode === 'approve' ? (
										<View className="gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
											<Text className="font-inter-medium text-sm leading-5 text-emerald-900">
												Confirma a aprovação do orçamento #{state.quote.code} no
												valor de {formatBRL(state.quote.total_value)}? Depois de
												aprovado, iniciamos o serviço e enviamos o comprovante
												comercial por e-mail.
											</Text>
											<View className="flex-row flex-wrap gap-3">
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => void decide(true)}
													className={`rounded-lg px-4 py-3 ${submitting ? 'bg-gray-300' : 'bg-emerald-600'}`}
												>
													<Text className="font-inter-medium text-sm text-white">
														{submitting ? 'Enviando...' : 'Confirmar aprovação'}
													</Text>
												</TouchableOpacity>
												<TouchableOpacity
													accessibilityRole="button"
													disabled={submitting}
													onPress={() => setMode('choose')}
													className="rounded-lg border border-gray-300 bg-white px-4 py-3"
												>
													<Text className="font-inter-medium text-sm text-gray-700">
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
													setMode('approve');
												}}
												className="min-w-[160px] flex-1 items-center rounded-lg bg-emerald-600 px-4 py-3"
											>
												<Text className="font-inter-medium text-sm text-white">
													Aprovar orçamento
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												accessibilityRole="button"
												onPress={() => {
													setActionError('');
													setMode('reprove');
												}}
												className="min-w-[160px] flex-1 items-center rounded-lg border border-red-200 px-4 py-3"
											>
												<Text className="font-inter-medium text-sm text-red-700">
													Reprovar orçamento
												</Text>
											</TouchableOpacity>
										</View>
									)}
								</>
							) : null}

							{actionError ? (
								<Text className="font-inter text-sm text-red-700">
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
