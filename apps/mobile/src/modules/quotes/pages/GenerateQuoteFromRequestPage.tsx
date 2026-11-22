import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ComponentProps,
	type ComponentType,
} from 'react';
import {
	ActivityIndicator,
	Platform,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { CircleAlert } from 'lucide-react-native';
import { usePermission } from '../../auth/hooks/usePermission';

import {
	fetchRequestById,
	updateRequestStatus,
} from '../../requests/services/requests';
import type { RequestItem } from '../../requests/services/requests';
import { generateQuoteFromRequest } from '../services/quotesService';
import type { QuoteFromRequestResponse } from '../services/quotesService';
import { GeneratedQuoteNotice } from '../components/GeneratedQuoteNotice';
import { AlreadyGeneratedQuoteNotice } from '../components/AlreadyGeneratedQuoteNotice';
import { QuoteRequestPageHeader } from '../components/QuoteRequestPageHeader';
import { QuoteGenerationPanel } from '../components/QuoteGenerationPanel';
import { RejectedRequestNotice } from '../components/RejectedRequestNotice';
import { RequestDecisionPanel } from '../components/RequestDecisionPanel';
import { RequestSummarySections } from '../components/RequestSummarySections';
import {
	getGenerationError,
	getStatusUpdateError,
} from '../utils/quoteRequestErrors';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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

function LoadingState() {
	const themeColors = useThemeColors();
	return (
		<View className="bg-surface rounded-lg border border-border p-8 items-center gap-3">
			<ActivityIndicator color={themeColors.primaryText} />
			<Text className="font-inter text-sm text-foreground-muted">
				Carregando dados da requisição...
			</Text>
		</View>
	);
}

function LoadErrorState({
	error,
	onRetry,
}: {
	error: string;
	onRetry: () => void;
}) {
	const themeColors = useThemeColors();
	return (
		<View className="bg-surface rounded-lg border border-border p-6">
			<View className="flex-row items-start gap-3">
				<CircleAlert size={20} color={themeColors.danger} />
				<Text className="flex-1 font-inter text-sm text-danger-text">
					{error}
				</Text>
			</View>
			<TouchableOpacity
				accessibilityRole="button"
				onPress={onRetry}
				className="self-start mt-5 rounded-lg border border-primary/30 px-4 py-2.5"
			>
				<Text className="font-inter-medium text-sm text-primary-text">
					Tentar novamente
				</Text>
			</TouchableOpacity>
		</View>
	);
}

export default function GenerateQuoteFromRequestPage() {
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const { requestId: rawRequestId } = useLocalSearchParams<{
		requestId: string | string[];
	}>();
	const requestId = Array.isArray(rawRequestId)
		? rawRequestId[0]
		: rawRequestId;
	const router = useRouter();
	const canWriteRequests = usePermission('requests.write');
	const canWriteQuotes = usePermission('quotes.write');
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
		canWriteQuotes &&
		request &&
		isApproved &&
		!request.quote_id &&
		missingFields.length === 0,
	);

	async function handleGenerateQuote() {
		if (!request || !canGenerate || generating || !canWriteQuotes) return;
		setGenerationError('');
		setGenerating(true);
		const result = await generateQuoteFromRequest(request.id);
		setGenerating(false);
		if (result.success) setGeneratedQuote(result.data);
		else setGenerationError(getGenerationError(result.status, result.detail));
	}

	async function handleStatusUpdate(status: 'approved' | 'reproved') {
		if (!request || statusUpdating || !canWriteRequests) return;
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

	return (
		<KeyboardContainer
			className="flex-1 bg-surface-subtle"
			contentContainerClassName="p-4 md:p-8 flex-grow"
			{...(Platform.OS === 'web'
				? {}
				: { bottomOffset: 20, keyboardShouldPersistTaps: 'handled' })}
		>
			<View className="w-full max-w-5xl self-center">
				<QuoteRequestPageHeader
					status={request?.status}
					onBack={() => router.back()}
				/>

				{loading ? (
					<LoadingState />
				) : loadError ? (
					<LoadErrorState
						error={loadError}
						onRetry={() => void loadRequest()}
					/>
				) : request ? (
					<>
						{generatedQuote ? (
							<GeneratedQuoteNotice
								quote={generatedQuote}
								onViewQuotes={() => router.replace('/orcamento' as never)}
							/>
						) : null}
						{!generatedQuote && request.quote_id ? (
							<AlreadyGeneratedQuoteNotice
								quoteId={request.quote_id}
								onViewQuotes={() => router.replace('/orcamento' as never)}
							/>
						) : null}
						<RequestSummarySections request={request} />

						{!generatedQuote && request.status === 'pending' && (
							<RequestDecisionPanel
								error={statusError}
								rejectionFormOpen={rejectionFormOpen}
								reprovalReason={reprovalReason}
								statusUpdating={statusUpdating}
								onReasonChange={(value) => {
									setReprovalReason(value);
									setStatusError('');
								}}
								onOpenRejection={() => setRejectionFormOpen(true)}
								onCancelRejection={() => {
									setRejectionFormOpen(false);
									setStatusError('');
								}}
								onApprove={() => void handleStatusUpdate('approved')}
								onReprove={() => void handleStatusUpdate('reproved')}
							/>
						)}

						{!generatedQuote && isApproved && !request.quote_id && (
							<QuoteGenerationPanel
								missingFields={missingFields}
								error={generationError}
								canGenerate={canGenerate}
								generating={generating}
								onGenerate={() => void handleGenerateQuote()}
							/>
						)}

						{request.status === 'reproved' ? (
							<RejectedRequestNotice
								reprovedBy={request.reproved_by_email}
								reason={request.reproval_reason}
							/>
						) : null}
					</>
				) : null}
			</View>
		</KeyboardContainer>
	);
}
