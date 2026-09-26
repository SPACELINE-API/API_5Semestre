import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	ArrowLeft,
	CheckCircle2,
	CircleAlert,
	FileText,
} from 'lucide-react-native';

import {
	fetchRequestById,
	updateRequestStatus,
} from '../../requests/services/requests';
import type { RequestItem } from '../../requests/services/requests';
import { generateQuoteFromRequest } from '../services/quotesService';
import type { QuoteFromRequestResponse } from '../services/quotesService';

type RequiredRequestField = {
	key: keyof Pick<
		RequestItem,
		| 'customer_name'
		| 'enterprise'
		| 'email'
		| 'original_language'
		| 'translation_language'
		| 'customer_need'
	>;
	label: string;
};

const REQUIRED_FIELDS: RequiredRequestField[] = [
	{ key: 'customer_name', label: 'Nome do cliente' },
	{ key: 'enterprise', label: 'Empresa' },
	{ key: 'email', label: 'E-mail' },
	{ key: 'original_language', label: 'Idioma de origem' },
	{ key: 'translation_language', label: 'Idioma de destino' },
	{ key: 'customer_need', label: 'Necessidade' },
];

function formatDate(value?: string) {
	if (!value) return '—';
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
			});
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
	return (
		<View className="flex-1 min-w-[180px] gap-1">
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<Text className="font-inter text-sm text-gray-900">
				{value?.trim() || 'Não informado'}
			</Text>
		</View>
	);
}

function getGenerationError(status: number, detail?: string) {
	if (status === 400) {
		return (
			detail ?? 'A requisição precisa estar aprovada e conter dados válidos.'
		);
	}
	if (status === 404) return 'Esta requisição não foi encontrada.';
	if (status === 409) return 'Já existe um orçamento para esta requisição.';
	if (status === 422)
		return detail ?? 'O identificador da requisição é inválido.';
	if (status === 0)
		return 'Falha de conexão. Verifique a conexão e tente novamente.';
	return detail ?? 'Não foi possível gerar o orçamento. Tente novamente.';
}

function getStatusUpdateError(status: number, detail?: string) {
	if (status === 404) return 'Esta requisição não foi encontrada.';
	if (status === 409)
		return detail ?? 'A situação da requisição foi alterada. Atualize os dados.';
	if (status === 422) return detail ?? 'Informe um motivo válido para reprovar.';
	if (status === 0)
		return 'Falha de conexão. Verifique a conexão e tente novamente.';
	return detail ?? 'Não foi possível atualizar a requisição. Tente novamente.';
}

export default function GenerateQuoteFromRequestPage() {
	const { requestId: rawRequestId } = useLocalSearchParams<{
		requestId: string | string[];
	}>();
	const requestId = Array.isArray(rawRequestId)
		? rawRequestId[0]
		: rawRequestId;
	const router = useRouter();
	const [request, setRequest] = useState<RequestItem | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState('');
	const [generating, setGenerating] = useState(false);
	const [generationError, setGenerationError] = useState('');
	const [statusUpdating, setStatusUpdating] = useState(false);
	const [statusError, setStatusError] = useState('');
	const [rejectionFormOpen, setRejectionFormOpen] = useState(false);
	const [reprovalReason, setReprovalReason] = useState('');
	const [generatedQuote, setGeneratedQuote] =
		useState<QuoteFromRequestResponse | null>(null);

	const loadRequest = useCallback(async () => {
		if (!requestId) {
			setLoadError('O identificador da requisição não foi informado.');
			setLoading(false);
			return;
		}

		setLoading(true);
		setLoadError('');
		try {
			const result = await fetchRequestById(requestId);
			setRequest(result);
			if (!result) setLoadError('Esta requisição não foi encontrada.');
		} catch {
			setLoadError('Não foi possível carregar a requisição. Tente novamente.');
		}
		setLoading(false);
	}, [requestId]);

	useEffect(() => {
		void loadRequest();
	}, [loadRequest]);

	const missingFields = useMemo(
		() =>
			request
				? REQUIRED_FIELDS.filter((field) => !request[field.key]?.trim())
				: [],
		[request],
	);
	const isApproved = request?.status === 'approved';
	const canGenerate = Boolean(
		request && isApproved && missingFields.length === 0,
	);

	async function handleGenerateQuote() {
		if (!request || !canGenerate || generating) return;
		setGenerationError('');
		setGenerating(true);
		const result = await generateQuoteFromRequest(request.id);
		setGenerating(false);
		if (result.success) {
			setGeneratedQuote(result.data);
		} else {
			setGenerationError(getGenerationError(result.status, result.detail));
		}
	}

	async function handleStatusUpdate(status: 'approved' | 'reproved') {
		if (!request || statusUpdating) return;
		if (status === 'reproved' && !reprovalReason.trim()) {
			setStatusError('Informe o motivo da reprovação.');
			return;
		}

		setStatusError('');
		setStatusUpdating(true);
		const result = await updateRequestStatus(
			request.id,
			status,
			reprovalReason,
		);
		setStatusUpdating(false);

		if (result.success) {
			setRequest(result.data);
			setRejectionFormOpen(false);
			setReprovalReason('');
		} else {
			setStatusError(getStatusUpdateError(result.status, result.detail));
		}
	}

	const statusLabel =
		request?.status === 'approved'
			? 'Aprovada'
			: request?.status === 'reproved'
				? 'Reprovada'
				: 'Pendente';
	const statusStyle =
		request?.status === 'approved'
			? { container: 'bg-green-50', text: 'text-green-800' }
			: request?.status === 'reproved'
				? { container: 'bg-red-50', text: 'text-red-800' }
				: { container: 'bg-orange-100', text: 'text-orange-800' };

	return (
		<ScrollView
			className="flex-1 bg-gray-50"
			contentContainerClassName="p-4 md:p-8 flex-grow"
		>
			<View className="w-full max-w-5xl self-center">
				<TouchableOpacity
					accessibilityRole="button"
					onPress={() => router.back()}
					className="flex-row items-center self-start gap-2 mb-6 rounded-lg px-2 py-2 hover:bg-gray-100"
				>
					<ArrowLeft size={17} color="#4b5563" />
					<Text className="font-inter-medium text-sm text-gray-600">
						Voltar para requisições
					</Text>
				</TouchableOpacity>

				<View className="flex-row flex-wrap items-start justify-between gap-4 mb-6">
					<View className="flex-1 min-w-[220px]">
						<Text className="font-poppins-bold text-2xl text-gray-900">
							Gerar orçamento
						</Text>
						<Text className="font-inter text-sm text-gray-500 mt-1">
							Revise os dados da requisição antes de confirmar a geração.
						</Text>
					</View>
					{request && (
						<View className={`rounded-md px-3 py-1.5 ${statusStyle.container}`}>
							<Text className={`font-inter-medium text-xs ${statusStyle.text}`}>
								{statusLabel}
							</Text>
						</View>
					)}
				</View>

				{loading ? (
					<View className="bg-white rounded-lg border border-gray-200 p-8 items-center gap-3">
						<ActivityIndicator color="#2563eb" />
						<Text className="font-inter text-sm text-gray-500">
							Carregando dados da requisição...
						</Text>
					</View>
				) : loadError ? (
					<View className="bg-white rounded-lg border border-gray-200 p-6">
						<View className="flex-row items-start gap-3">
							<CircleAlert size={20} color="#dc2626" />
							<Text className="flex-1 font-inter text-sm text-red-800">
								{loadError}
							</Text>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => void loadRequest()}
							className="self-start mt-5 rounded-lg border border-blue-200 px-4 py-2.5"
						>
							<Text className="font-inter-medium text-sm text-blue-700">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : request ? (
					<>
						{generatedQuote ? (
							<View className="bg-green-50 border border-green-200 rounded-lg p-5 mb-6">
								<View className="flex-row items-start gap-3">
									<CheckCircle2 size={22} color="#16a34a" />
									<View className="flex-1">
										<Text className="font-inter-bold text-base text-green-900">
											Orçamento criado a partir da requisição.
										</Text>
										<Text className="font-inter text-sm text-green-800 mt-1">
											Código do orçamento: #{generatedQuote.id.slice(0, 8).toUpperCase()}
										</Text>
										<Text className="font-inter text-xs text-green-800 mt-1">
												Status: Pendente
										</Text>
										<Text className="font-inter text-xs text-green-800 mt-1">
											Criado em: {formatDate(generatedQuote.created_at)}
										</Text>
									</View>
								</View>
								<TouchableOpacity
									accessibilityRole="button"
									onPress={() => router.replace('/orcamento' as never)}
									className="self-start mt-4 rounded-lg bg-green-700 px-4 py-2.5"
								>
									<Text className="font-inter-medium text-sm text-white">
										Ver orçamentos
									</Text>
								</TouchableOpacity>
							</View>
						) : null}

						<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
							<View className="flex-row items-center gap-3 mb-5">
								<View className="h-10 w-10 rounded-lg bg-blue-50 items-center justify-center">
									<FileText size={20} color="#2563eb" />
								</View>
								<View className="flex-1">
									<Text className="font-inter-bold text-sm text-gray-900">
										Dados da requisição
									</Text>
									<Text className="font-inter text-xs text-gray-500 mt-0.5">
										Solicitação #{request.id.slice(0, 8).toUpperCase()}
									</Text>
								</View>
							</View>
							<View className="flex-row flex-wrap gap-x-8 gap-y-5">
								<InfoField label="Cliente" value={request.customer_name} />
								<InfoField label="Empresa" value={request.enterprise} />
								<InfoField label="E-mail" value={request.email} />
								<InfoField
									label="Data da solicitação"
									value={formatDate(request.request_date)}
								/>
								{request.approved_at && (
									<InfoField
										label="Aprovada em"
										value={formatDate(request.approved_at)}
									/>
								)}
								{request.reproved_at && (
									<InfoField
										label="Reprovada em"
										value={formatDate(request.reproved_at)}
									/>
								)}
							</View>
						</View>
						{request.status === 'reproved' && request.reproval_reason ? (
							<View className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
								<Text className="font-inter-semibold text-sm text-red-900">
									Motivo da reprovação
								</Text>
								<Text className="mt-1 font-inter text-sm text-red-800">
									{request.reproval_reason}
								</Text>
							</View>
						) : null}

						<View className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 mb-6">
							<Text className="font-inter-bold text-sm text-gray-900 mb-5">
								Dados do serviço solicitado
							</Text>
							<View className="flex-row flex-wrap gap-x-8 gap-y-5">
								<InfoField
									label="Idioma de origem"
									value={request.original_language}
								/>
								<InfoField
									label="Idioma de destino"
									value={request.translation_language}
								/>
								<View className="w-full gap-1">
									<Text className="font-inter-medium text-xs text-gray-500">
										Necessidade
									</Text>
									<Text className="font-inter text-sm text-gray-900">
										{request.customer_need?.trim() || 'Não informado'}
									</Text>
								</View>
							</View>
						</View>

						{!generatedQuote && request.status === 'pending' && (
							<View className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
								<Text className="font-inter-bold text-sm text-gray-900">
									Decisão da solicitação
								</Text>
								<Text className="mt-1 font-inter text-sm text-gray-500">
									Aprove para liberar a geração do orçamento ou informe o motivo da reprovação.
								</Text>
								{statusError ? (
									<View className="mt-4 flex-row items-start gap-2 rounded-lg bg-red-50 p-3">
										<CircleAlert size={18} color="#dc2626" />
										<Text className="flex-1 font-inter text-sm text-red-800">
											{statusError}
										</Text>
									</View>
								) : null}

								{rejectionFormOpen ? (
									<View className="mt-4 gap-2">
										<Text className="font-inter-medium text-sm text-gray-800">
											Motivo da reprovação
										</Text>
										<TextInput
											value={reprovalReason}
											onChangeText={(value) => {
												setReprovalReason(value);
												setStatusError('');
											}}
											maxLength={500}
											multiline
											textAlignVertical="top"
											placeholder="Explique por que a solicitação foi reprovada"
											className="min-h-24 rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
										/>
										<Text className="text-right font-inter text-xs text-gray-400">
											{reprovalReason.length}/500
										</Text>
										<View className="flex-row flex-wrap gap-3">
											<TouchableOpacity
												accessibilityRole="button"
												disabled={statusUpdating}
												onPress={() => void handleStatusUpdate('reproved')}
												className={`rounded-lg px-4 py-2.5 ${statusUpdating ? 'bg-gray-300' : 'bg-red-600'}`}
											>
												<Text className="font-inter-medium text-sm text-white">
													{statusUpdating ? 'Salvando...' : 'Confirmar reprovação'}
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												accessibilityRole="button"
												disabled={statusUpdating}
												onPress={() => {
													setRejectionFormOpen(false);
													setStatusError('');
												}}
												className="rounded-lg border border-gray-300 px-4 py-2.5"
											>
												<Text className="font-inter-medium text-sm text-gray-700">
													Cancelar
												</Text>
											</TouchableOpacity>
										</View>
									</View>
								) : (
									<View className="mt-5 flex-row flex-wrap gap-3">
										<TouchableOpacity
											accessibilityRole="button"
											disabled={statusUpdating}
											onPress={() => setRejectionFormOpen(true)}
											className="rounded-lg border border-red-200 px-4 py-3"
										>
											<Text className="font-inter-medium text-sm text-red-700">
												Reprovar solicitação
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											accessibilityRole="button"
											disabled={statusUpdating}
											onPress={() => void handleStatusUpdate('approved')}
											className={`rounded-lg px-4 py-3 ${statusUpdating ? 'bg-gray-300' : 'bg-blue-600'}`}
										>
											<Text className="font-inter-medium text-sm text-white">
												{statusUpdating ? 'Salvando...' : 'Aprovar solicitação'}
											</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						)}

						{!generatedQuote && request.status === 'reproved' && (
							<View className="flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
								<CircleAlert size={19} color="#dc2626" />
								<Text className="flex-1 font-inter text-sm text-red-800">
									Esta solicitação foi reprovada e não pode gerar um orçamento.
								</Text>
							</View>
						)}

						{!generatedQuote && isApproved && (
							<>
								{missingFields.length > 0 && (
									<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
										<CircleAlert size={19} color="#dc2626" />
										<View className="flex-1">
											<Text className="font-inter-bold text-sm text-red-900">
												Dados obrigatórios ausentes
											</Text>
											<Text className="mt-1 font-inter text-sm text-red-800">
												Preencha na requisição: {missingFields
													.map((field) => field.label)
													.join(', ')}.
												</Text>
										</View>
									</View>
								)}
								{generationError ? (
									<View className="mb-6 flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
										<CircleAlert size={19} color="#dc2626" />
										<Text className="flex-1 font-inter text-sm text-red-800">
											{generationError}
										</Text>
									</View>
								) : null}

								<View className="flex-col items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 md:flex-row md:items-center md:p-6">
									<View className="flex-1">
										<Text className="font-inter-bold text-sm text-gray-900">
											Revisão do orçamento
										</Text>
										<Text className="mt-1 font-inter text-sm text-gray-500">
											Os dados aprovados serão usados para criar o orçamento. Itens
											e documentos poderão ser incluídos depois.
										</Text>
									</View>
									<TouchableOpacity
										accessibilityRole="button"
										accessibilityState={{ disabled: !canGenerate || generating }}
										disabled={!canGenerate || generating}
										onPress={() => void handleGenerateQuote()}
										className={`w-full items-center rounded-lg px-6 py-3 md:w-auto ${canGenerate && !generating ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300'}`}
									>
										<Text className="font-inter-medium text-sm text-white">
											{generating ? 'Gerando orçamento...' : 'Confirmar geração'}
										</Text>
									</TouchableOpacity>
								</View>
							</>
						)}
					</>
				) : null}
			</View>
		</ScrollView>
	);
}
