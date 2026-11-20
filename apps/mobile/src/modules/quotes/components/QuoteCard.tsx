import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	Building2,
	CalendarDays,
	ChevronDown,
	ChevronUp,
	CircleAlert,
	ExternalLink,
	FileText,
	Paperclip,
	Pencil,
	Lock,
	Plus,
	RotateCcw,
	Search,
	Send,
	Trash2,
	X,
} from 'lucide-react-native';
import type { ManagedQuote, QuoteManagerItem } from '../services/quotesService';
import {
	REOPENABLE_QUOTE_STATUSES,
	createQuoteItem,
	deleteQuoteItem,
	updateQuote,
	updateQuoteItem,
	uploadQuoteDocument,
} from '../services/quotesService';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { openDocument } from '../../../shared/components/FilePreview';
import { getFileName } from '../../../shared/utils/file';
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../shared/utils/currency';
import {
	listCompanies,
	createCompany,
} from '../../clients/services/companyService';
import type { Company, CompanyCreateInput } from '../../clients/types/company';
import { CompanyFormModal } from '../../clients/components/CompanyFormModal';
import { usePermission } from '../../auth/hooks/usePermission';
import type {
	AdditionalService,
	AdditionalServiceFormData,
} from '../services/additionalService';
import {
	createAdditionalService,
	listAdditionalServicesByQuote,
	updateAdditionalService,
	updateAdditionalServiceStatus,
} from '../services/additionalService';
import { AdditionalServiceCard } from './AdditionalServiceCard';
import { AdditionalServiceFormModal } from './AdditionalServiceFormModal';
import { LanguageSelect } from './LanguageSelect';
import { QuoteReceiptSection } from './QuoteReceiptSection';
import { getServiceOrder } from '../../service-orders/services/serviceOrderService';
import { listTranslators } from '../../service-orders/services/translatorService';
import type {
	ServiceOrderItem,
	Translator,
} from '../../service-orders/types/serviceOrder';
import { ItemsTable } from '../../service-orders/components/ItemsTable';
import { ReopenQuoteDialog } from './ReopenQuoteDialog';
import { ReopenedQuoteIndicator } from './ReopenedQuoteIndicator';
import { SendQuoteDialog } from './SendQuoteDialog';
import {
	parseWordCountInput,
	WORD_COUNT_MAX_DIGITS,
	wordCountInputValue,
} from '../utils/wordCount';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export const quoteStatusStyles: Record<
	string,
	{ label: string; classes: string }
> = {
	draft: {
		label: 'Em preparação',
		classes: 'bg-primary-soft text-primary-text',
	},
	pending: {
		label: 'Aguardando aprovação',
		classes: 'bg-warning-soft text-warning-text',
	},
	approved: { label: 'Aprovado', classes: 'bg-success-soft text-success-text' },
	reproved: { label: 'Reprovado', classes: 'bg-danger-soft text-danger' },
	cancelled: {
		label: 'Cancelado',
		classes: 'bg-surface-muted text-foreground-secondary',
	},
};

const lockedStatusMessages: Record<string, string> = {
	pending:
		'Este orçamento foi enviado ao cliente e está aguardando aprovação. Reabra o orçamento para alterá-lo.',
	approved:
		'Este orçamento já foi aprovado e está bloqueado para edição. Reabra o orçamento para alterá-lo.',
	reproved:
		'Este orçamento foi reprovado e está bloqueado para edição. Reabra o orçamento para alterá-lo.',
	cancelled:
		'Este orçamento foi cancelado porque o prazo de validade de 30 dias expirou e não pode mais ser alterado.',
};

function formatDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
}

function formatDay(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			});
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function daysUntil(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return Math.ceil((date.getTime() - Date.now()) / DAY_IN_MS);
}

function validityLabel(value: string) {
	const days = daysUntil(value);
	const base = `Válido até ${formatDay(value)}`;
	if (days === null || days > 7) return { text: base, urgent: false };
	if (days <= 0) return { text: `${base} · vence hoje`, urgent: true };
	return {
		text: `${base} · vence em ${days} ${days === 1 ? 'dia' : 'dias'}`,
		urgent: days <= 3,
	};
}

function display(value: string | null | undefined) {
	return value?.trim() || 'Não informado';
}

function shortId(value: string) {
	return value.slice(0, 8).toUpperCase();
}

function formatWordCount(value: number) {
	return `${value.toLocaleString('pt-BR')} ${value === 1 ? 'palavra' : 'palavras'}`;
}

function summarizeWordCount(
	items: { file_url: string | null; word_count: number | null }[],
) {
	const withFile = items.filter((item) => (item.file_url ?? '').trim());
	const counted = withFile.filter((item) => item.word_count != null);
	return {
		hasDocuments: withFile.length > 0,
		total: counted.reduce((sum, item) => sum + (item.word_count ?? 0), 0),
		uncounted: withFile.length - counted.length,
	};
}

function WordCountSummary({
	items,
}: {
	items: { file_url: string | null; word_count: number | null }[];
}) {
	const summary = summarizeWordCount(items);
	if (!summary.hasDocuments) return null;

	return (
		<View
			testID="quote-word-count-total"
			className="mb-4 flex-row flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-surface-subtle px-3 py-2"
		>
			<Text className="font-inter-semibold text-sm text-foreground">
				Total de palavras: {summary.total.toLocaleString('pt-BR')}
			</Text>
			{summary.uncounted > 0 ? (
				<Text className="font-inter text-xs text-foreground-muted">
					{summary.uncounted === 1
						? '1 documento sem contagem'
						: `${summary.uncounted} documentos sem contagem`}
				</Text>
			) : null}
		</View>
	);
}

function formatPrice(value: number | string | null) {
	if (value == null) return 'Valor não informado';
	return Number(value).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}

function QuoteField({ label, value }: { label: string; value: string }) {
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				{label}
			</Text>
			<Text selectable className="font-inter text-sm leading-5 text-foreground">
				{value}
			</Text>
		</View>
	);
}

function EditField({
	label,
	value,
	onChangeText,
	keyboardType,
}: {
	label: string;
	value: string;
	onChangeText: (value: string) => void;
	keyboardType?: 'default' | 'numeric' | 'email-address';
}) {
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				{label}
			</Text>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				keyboardType={keyboardType}
				className="rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
			/>
		</View>
	);
}

function WordCountField({
	value,
	hasFile,
	onChangeValue,
}: {
	value: number | null;
	hasFile: boolean;
	onChangeValue: (value: number | null) => void;
}) {
	const themeColors = useThemeColors();
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				Quantidade de palavras
			</Text>
			<TextInput
				accessibilityLabel="Quantidade de palavras"
				testID="quote-item-word-count-input"
				value={wordCountInputValue(value)}
				onChangeText={(text) => onChangeValue(parseWordCountInput(text))}
				keyboardType="number-pad"
				inputMode="numeric"
				maxLength={WORD_COUNT_MAX_DIGITS}
				placeholder="Sem contagem"
				placeholderTextColor={themeColors.foregroundSubtle}
				className="rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
			/>
			{hasFile && value == null ? (
				<Text className="font-inter text-xs text-foreground-muted">
					Não foi possível contar as palavras do arquivo. Informe a quantidade
					manualmente.
				</Text>
			) : null}
		</View>
	);
}

function CurrencyField({
	label,
	value,
	onChangeValue,
}: {
	label: string;
	value: string;
	onChangeValue: (value: string) => void;
}) {
	const themeColors = useThemeColors();
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				{label}
			</Text>
			<TextInput
				value={value ? decimalStringToBRL(value) : ''}
				onChangeText={(text) => onChangeValue(maskCurrencyDigits(text))}
				keyboardType="numeric"
				placeholder="R$ 0,00"
				placeholderTextColor={themeColors.foregroundSubtle}
				className="rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
			/>
		</View>
	);
}

function CompanyLinkField({
	companies,
	companyId,
	onSelectCompany,
	onRequestCreate,
}: {
	companies: Company[];
	companyId: string | null;
	onSelectCompany: (id: string) => void;
	onRequestCreate: (searchText: string) => void;
}) {
	const themeColors = useThemeColors();
	const canWriteClients = usePermission('clients.write');
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const triggerRef = useRef<View>(null);
	const [anchor, setAnchor] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const selected = companies.find((company) => company.id === companyId);

	const filtered = companies.filter((company) => {
		const query = search.trim().toLowerCase();
		if (!query) return true;
		return (
			company.trade_name.toLowerCase().includes(query) ||
			company.legal_name.toLowerCase().includes(query)
		);
	});

	function openPicker() {
		triggerRef.current?.measureInWindow((x, y, width, height) => {
			setAnchor({ x, y, width, height });
			setIsOpen(true);
		});
	}

	function closePicker() {
		setIsOpen(false);
		setSearch('');
	}

	return (
		<View className="w-full gap-1">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				Empresa vinculada
			</Text>
			<View ref={triggerRef} collapsable={false}>
				{selected ? (
					<View className="flex-row items-center justify-between rounded-lg border border-border-strong bg-surface px-3 py-2">
						<Text className="font-inter text-sm text-foreground">
							{selected.trade_name}
						</Text>
						<TouchableOpacity accessibilityRole="button" onPress={openPicker}>
							<Text className="font-inter-medium text-xs text-primary-text">
								Trocar
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity
						accessibilityRole="button"
						onPress={openPicker}
						className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-3 py-2.5"
					>
						<Building2 size={14} color={themeColors.foregroundMuted} />
						<Text className="font-inter-medium text-sm text-foreground-secondary">
							Vincular empresa
						</Text>
					</TouchableOpacity>
				)}
			</View>

			<Modal
				visible={isOpen && !!anchor}
				transparent
				animationType="none"
				onRequestClose={closePicker}
			>
				<Pressable className="absolute inset-0" onPress={closePicker} />

				{anchor && (
					<View
						className="absolute rounded-lg border border-border bg-surface shadow-sm"
						style={{
							top: anchor.y + anchor.height + 4,
							left: anchor.x,
							width: anchor.width,
							maxHeight: 280,
							backgroundColor: 'white',
						}}
					>
						<View className="flex-row items-center gap-2 border-b border-border-subtle px-3 py-2">
							<Search size={14} color={themeColors.foregroundSubtle} />
							<TextInput
								autoFocus
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar empresa"
								placeholderTextColor={themeColors.foregroundSubtle}
								className="flex-1 font-inter text-sm text-foreground max-md:min-w-0 max-md:shrink max-md:leading-5"
							/>
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Fechar busca de empresa"
								onPress={closePicker}
							>
								<X size={14} color={themeColors.foregroundMuted} />
							</TouchableOpacity>
						</View>
						<ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
							{filtered.map((company) => (
								<TouchableOpacity
									key={company.id}
									onPress={() => {
										onSelectCompany(company.id);
										closePicker();
									}}
									className="border-b border-border-subtle px-3 py-2"
								>
									<Text className="font-inter text-sm text-foreground">
										{company.trade_name}
									</Text>
									<Text className="font-inter text-xs text-foreground-subtle">
										{company.legal_name}
									</Text>
								</TouchableOpacity>
							))}
							{filtered.length === 0 && (
								<Text className="px-3 py-3 font-inter text-sm text-foreground-subtle">
									Nenhuma empresa encontrada.
								</Text>
							)}
						</ScrollView>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => {
								onRequestCreate(search.trim());
								closePicker();
							}}
							disabled={!canWriteClients}
							className={`flex-row items-center gap-2 border-t border-border-subtle bg-surface-subtle px-3 py-2.5 ${!canWriteClients ? 'opacity-40' : ''}`}
						>
							<Plus size={14} color={themeColors.primaryText} />
							<Text className="font-inter-medium text-xs text-primary-text">
								Criar nova empresa
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</Modal>
		</View>
	);
}

function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<Text className="mb-4 font-inter-semibold text-sm text-foreground">
			{children}
		</Text>
	);
}

type DraftAdditionalService = {
	id: string;
	description: string;
	price: string;
};

function toDraftAdditionalService(
	service: AdditionalService,
): DraftAdditionalService {
	return {
		id: service.id,
		description: service.description,
		price: Number(service.price).toFixed(2),
	};
}

type DraftItem = {
	id: string;
	isNew: boolean;
	source_language: string;
	target_language: string;
	document_type: string;
	estimated_value: string;
	file_url: string | null;
	word_count: number | null;
};

function toDraftItem(item: QuoteManagerItem): DraftItem {
	return {
		id: item.id,
		isNew: false,
		source_language: item.source_language,
		target_language: item.target_language,
		document_type: item.document_type ?? '',
		estimated_value:
			item.estimated_value == null ? '' : String(item.estimated_value),
		file_url: item.file_url,
		word_count: item.word_count ?? null,
	};
}

export function QuoteCard({
	quote,
	onDecide,
	onSend,
	onReopen,
	onOpenServiceOrder,
	onQuoteChange,
	updating,
}: {
	quote: ManagedQuote;
	onDecide: (
		status: 'approved' | 'reproved',
		reason?: string,
	) => Promise<string | null>;
	onSend: () => Promise<string | null>;
	onReopen: (reason: string) => Promise<string | null>;
	onOpenServiceOrder: () => void;
	onQuoteChange: (quote: ManagedQuote) => void;
	updating: boolean;
}) {
	const themeColors = useThemeColors();
	const [expanded, setExpanded] = useState(false);
	const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
	const [rejectionFormOpen, setRejectionFormOpen] = useState(false);
	const [reprovalReason, setReprovalReason] = useState('');
	const [decisionError, setDecisionError] = useState('');
	const [sendError, setSendError] = useState('');
	const [feedbackMessage, setFeedbackMessage] = useState('');
	const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
	const [reopenIndicatorOpen, setReopenIndicatorOpen] = useState(false);
	const canWriteQuotes = usePermission('quotes.write');
	const canApproveQuotes = usePermission('quotes.approve');
	const canReopenQuotes = usePermission('quotes.reopen');
	const canWriteClients = usePermission('clients.write');
	const canApproveQuote = Boolean(quote.company_id && quote.items.length > 0);
	const canWriteDocuments = usePermission('documents.write');
	const isDraft = quote.status === 'draft';
	const canEditQuote = canWriteQuotes && isDraft;
	const canReopenQuote =
		canReopenQuotes && REOPENABLE_QUOTE_STATUSES.includes(quote.status);
	const lockedMessage = lockedStatusMessages[quote.status];
	const validity =
		(quote.status === 'draft' || quote.status === 'pending') &&
		quote.valid_until
			? validityLabel(quote.valid_until)
			: null;
	const hasItemWithoutFile = quote.items.some(
		(item) => !(item.file_url ?? '').trim(),
	);
	const canSendQuote =
		Boolean(quote.company_id) && quote.items.length > 0 && !hasItemWithoutFile;
	const [sendDialogOpen, setSendDialogOpen] = useState(false);

	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState('');
	const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
	const [customerName, setCustomerName] = useState(quote.customer_name ?? '');
	const [enterprise, setEnterprise] = useState(quote.enterprise ?? '');
	const [email, setEmail] = useState(quote.email ?? '');
	const [originalLanguage, setOriginalLanguage] = useState(
		quote.original_language ?? '',
	);
	const [translationLanguage, setTranslationLanguage] = useState(
		quote.translation_language ?? '',
	);
	const [customerNeed, setCustomerNeed] = useState(quote.customer_need ?? '');
	const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [companyId, setCompanyId] = useState<string | null>(
		quote.company_id ?? null,
	);
	const [showCreateCompany, setShowCreateCompany] = useState(false);
	const [createCompanySeed, setCreateCompanySeed] = useState('');
	const [createCompanyError, setCreateCompanyError] = useState<string | null>(
		null,
	);

	const [additionalServices, setAdditionalServices] = useState<
		AdditionalService[]
	>([]);
	const [additionalServicesLoading, setAdditionalServicesLoading] =
		useState(false);
	const [additionalServicesError, setAdditionalServicesError] = useState('');
	const [showAdditionalServiceModal, setShowAdditionalServiceModal] =
		useState(false);
	const [draftAdditionalServices, setDraftAdditionalServices] = useState<
		DraftAdditionalService[]
	>([]);

	const [serviceOrderItems, setServiceOrderItems] = useState<
		ServiceOrderItem[]
	>([]);
	const [serviceOrderItemsLoading, setServiceOrderItemsLoading] =
		useState(false);
	const [serviceOrderItemsError, setServiceOrderItemsError] = useState('');
	const [translators, setTranslators] = useState<Translator[]>([]);

	const translatorsById = new Map(
		translators.map((translator) => [translator.id, translator]),
	);

	useEffect(() => {
		listCompanies()
			.then(setCompanies)
			.catch(() => setCompanies([]));
	}, []);

	useEffect(() => {
		if (!expanded) return;

		let active = true;
		setAdditionalServicesLoading(true);
		setAdditionalServicesError('');
		listAdditionalServicesByQuote(quote.id)
			.then((services) => {
				if (active) setAdditionalServices(services);
			})
			.catch(() => {
				if (active)
					setAdditionalServicesError(
						'Não foi possível carregar os serviços adicionais.',
					);
			})
			.finally(() => {
				if (active) setAdditionalServicesLoading(false);
			});

		return () => {
			active = false;
		};
	}, [expanded, quote.id]);

	useEffect(() => {
		if (!expanded || !quote.service_order_id) return;

		let active = true;
		setServiceOrderItemsLoading(true);
		setServiceOrderItemsError('');
		getServiceOrder(quote.service_order_id)
			.then((serviceOrder) => {
				if (active) setServiceOrderItems(serviceOrder.items);
			})
			.catch(() => {
				if (active)
					setServiceOrderItemsError(
						'Não foi possível carregar os itens do orçamento.',
					);
			})
			.finally(() => {
				if (active) setServiceOrderItemsLoading(false);
			});
		listTranslators()
			.then((data) => {
				if (active) setTranslators(data);
			})
			.catch(() => {
				if (active) setTranslators([]);
			});

		return () => {
			active = false;
		};
	}, [expanded, quote.service_order_id]);

	useEffect(() => {
		if (!isDraft) setIsEditing(false);
	}, [isDraft]);

	const status = quoteStatusStyles[quote.status.toLowerCase()] ?? {
		label: quote.status,
		classes: 'bg-surface-muted text-foreground-secondary',
	};

	function startEditing() {
		if (!canEditQuote) return;
		setCustomerName(quote.customer_name ?? '');
		setEnterprise(quote.enterprise ?? '');
		setEmail(quote.email ?? '');
		setOriginalLanguage(quote.original_language ?? '');
		setTranslationLanguage(quote.translation_language ?? '');
		setCustomerNeed(quote.customer_need ?? '');
		setDraftItems(quote.items.map(toDraftItem));
		setDraftAdditionalServices(
			additionalServices
				.filter((service) => service.status !== 'approved')
				.map(toDraftAdditionalService),
		);
		setCompanyId(quote.company_id ?? null);
		setSaveError('');
		setIsEditing(true);
	}

	function cancelEditing() {
		setIsEditing(false);
		setSaveError('');
	}

	function updateDraftItem(id: string, patch: Partial<DraftItem>) {
		setDraftItems((current) =>
			current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
		);
	}

	function removeDraftItem(id: string) {
		setDraftItems((current) => current.filter((item) => item.id !== id));
	}

	function addDraftItem() {
		setDraftItems((current) => [
			...current,
			{
				id: `new-${Date.now()}`,
				isNew: true,
				source_language: '',
				target_language: '',
				document_type: '',
				estimated_value: '',
				file_url: null,
				word_count: null,
			},
		]);
	}

	function requestCreateCompany(searchText: string) {
		if (!canWriteClients) return;
		setCreateCompanySeed(searchText || enterprise);
		setCreateCompanyError(null);
		setShowCreateCompany(true);
	}

	async function handleCreateCompany(data: CompanyCreateInput) {
		if (!canWriteClients) return;
		try {
			const company = await createCompany(data);
			setCompanies((current) => [...current, company]);
			setCompanyId(company.id);
			setShowCreateCompany(false);
		} catch (error) {
			setCreateCompanyError(
				error instanceof Error
					? error.message
					: 'Não foi possível cadastrar a empresa.',
			);
			throw error;
		}
	}

	function updateDraftAdditionalService(
		id: string,
		patch: Partial<DraftAdditionalService>,
	) {
		setDraftAdditionalServices((current) =>
			current.map((service) =>
				service.id === id ? { ...service, ...patch } : service,
			),
		);
	}

	async function handleCreateAdditionalService(
		data: AdditionalServiceFormData,
	) {
		if (!canWriteQuotes) return;
		const service = await createAdditionalService({
			...data,
			quote_id: quote.id,
		});
		setAdditionalServices((current) => [...current, service]);
	}

	async function handleCompleteAdditionalService(service: AdditionalService) {
		if (!canWriteQuotes) return;
		setSaveError('');
		try {
			const updated = await updateAdditionalServiceStatus(
				service.id,
				'approved',
			);
			setAdditionalServices((current) =>
				current.map((item) => (item.id === updated.id ? updated : item)),
			);
		} catch (error) {
			setSaveError(
				error instanceof Error
					? error.message
					: 'Não foi possível concluir o serviço adicional.',
			);
			throw error;
		}
	}

	async function handleSend() {
		setSendError('');
		setFeedbackMessage('');
		const message = await onSend();
		setSendDialogOpen(false);
		if (message) setSendError(message);
		else
			setFeedbackMessage(
				'Orçamento enviado por e-mail ao cliente. Ele pode aprovar ou reprovar pelo link recebido.',
			);
	}

	async function handleReopen(reason: string) {
		setFeedbackMessage('');
		const message = await onReopen(reason);
		if (!message) {
			setReopenDialogOpen(false);
			setFeedbackMessage(
				'Orçamento reaberto. Ele está em preparação e pode ser alterado.',
			);
		}
		return message;
	}

	async function handlePickItemFile(itemId: string) {
		if (!canWriteDocuments) return;
		const file = await pickDocument();
		if (!file) return;

		setUploadingItemId(itemId);
		try {
			const uploaded = await uploadQuoteDocument(file.uri, file.name);
			if (uploaded) {
				updateDraftItem(itemId, {
					file_url: uploaded.file_url,
					word_count: uploaded.word_count,
				});
			} else {
				setSaveError('Não foi possível enviar o arquivo. Tente novamente.');
			}
		} finally {
			setUploadingItemId(null);
		}
	}

	async function handleSave() {
		if (!canWriteQuotes) return;
		if (
			draftAdditionalServices.some(
				(service) => !service.description.trim() || !service.price,
			)
		) {
			setSaveError(
				'Informe a descrição e o valor de todos os serviços adicionais.',
			);
			return;
		}

		setIsSaving(true);
		setSaveError('');

		try {
			const removedItemIds = quote.items
				.map((item) => item.id)
				.filter((id) => !draftItems.some((draft) => draft.id === id));

			const quoteResult = await updateQuote(quote.id, {
				company_id: companyId,
				customer_name: customerName.trim(),
				enterprise: enterprise.trim(),
				email: email.trim(),
				original_language: originalLanguage.trim(),
				translation_language: translationLanguage.trim(),
				customer_need: customerNeed.trim(),
			});

			if (!quoteResult.success) {
				setSaveError(
					quoteResult.detail ??
						'Não foi possível salvar os dados do orçamento.',
				);
				return;
			}

			await Promise.all(
				removedItemIds.map((itemId) => deleteQuoteItem(quote.id, itemId)),
			);

			const itemResults = await Promise.all(
				draftItems.map((draft) => {
					const payload = {
						source_language: draft.source_language.trim(),
						target_language: draft.target_language.trim(),
						document_type: draft.document_type.trim() || null,
						estimated_value: draft.estimated_value.trim()
							? Number(draft.estimated_value.replace(',', '.'))
							: null,
						file_url: draft.file_url,
						word_count: draft.word_count,
					};
					return draft.isNew
						? createQuoteItem(quote.id, {
								source_language: payload.source_language,
								target_language: payload.target_language,
								document_type: payload.document_type ?? undefined,
								file_url: payload.file_url ?? undefined,
								word_count: payload.word_count ?? undefined,
								estimated_value: payload.estimated_value ?? undefined,
							})
						: updateQuoteItem(quote.id, draft.id, payload);
				}),
			);

			const failedItem = itemResults.find((result) => !result.success);
			if (failedItem && !failedItem.success) {
				setSaveError(
					failedItem.detail ?? 'Não foi possível salvar um dos itens.',
				);
				return;
			}

			const savedItems = itemResults
				.filter(
					(result): result is Extract<typeof result, { success: true }> =>
						result.success,
				)
				.map((result) => result.data);

			const changedAdditionalServices = draftAdditionalServices.filter(
				(draft) => {
					const original = additionalServices.find(
						(service) => service.id === draft.id,
					);
					return (
						original &&
						(original.description !== draft.description.trim() ||
							Number(original.price) !== Number(draft.price))
					);
				},
			);

			try {
				const updatedAdditionalServices = await Promise.all(
					changedAdditionalServices.map((draft) =>
						updateAdditionalService(draft.id, {
							description: draft.description.trim(),
							price: Number(draft.price),
						}),
					),
				);
				setAdditionalServices((current) =>
					current.map(
						(service) =>
							updatedAdditionalServices.find(
								(updated) => updated.id === service.id,
							) ?? service,
					),
				);
			} catch (error) {
				setSaveError(
					error instanceof Error
						? error.message
						: 'Não foi possível salvar um dos serviços adicionais.',
				);
				return;
			}

			onQuoteChange({ ...quote, ...quoteResult.data, items: savedItems });
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<View
			className="mb-5 rounded-2xl border border-border bg-surface"
			style={{ zIndex: reopenIndicatorOpen ? 20 : 0 }}
		>
			<TouchableOpacity
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} orçamento ${shortId(quote.id)}`}
				onPress={() => setExpanded((current) => !current)}
				className="flex-row flex-wrap items-center justify-between gap-4 border-b border-border-subtle px-5 py-4 md:px-6"
				style={{ zIndex: reopenIndicatorOpen ? 10 : 0 }}
			>
				<View
					className="max-w-full flex-row items-center gap-3"
					style={{ zIndex: reopenIndicatorOpen ? 1 : 0 }}
				>
					<View className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
						<FileText size={21} color={themeColors.primaryText} />
					</View>
					<View className="min-w-0 shrink gap-1">
						<Text className="font-inter-bold text-base text-foreground">
							Orçamento #{shortId(quote.id)}
						</Text>
						<Text
							className="font-inter-medium text-sm text-foreground-secondary"
							numberOfLines={1}
						>
							{quote.company_name ||
								quote.enterprise ||
								'Empresa não vinculada'}
						</Text>
						<View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
							<View
								className={`rounded-full px-2.5 py-1 ${status.classes.split(' ')[0]}`}
							>
								<Text
									className={`font-inter-medium text-xs ${status.classes.split(' ')[1]}`}
								>
									{status.label}
								</Text>
							</View>
							{quote.reopened_at ? (
								<ReopenedQuoteIndicator
									reopenedAt={quote.reopened_at}
									reason={quote.reopen_reason}
									reopenedByEmail={quote.reopened_by_email}
									reopenCount={quote.reopen_count}
									onOpenChange={setReopenIndicatorOpen}
								/>
							) : null}
							<Text className="font-inter text-xs text-foreground-muted">
								{quote.request_id
									? 'Vinculado a uma solicitação'
									: 'Criado manualmente'}
							</Text>
							{validity ? (
								<Text
									className={`font-inter-medium text-xs ${validity.urgent ? 'text-danger' : 'text-warning-text'}`}
								>
									{validity.text}
								</Text>
							) : null}
						</View>
					</View>
				</View>
				<View className="flex-row flex-wrap items-center gap-3">
					<View className="flex-row items-center gap-2">
						<CalendarDays size={15} color={themeColors.foregroundMuted} />
						<Text className="font-inter text-xs text-foreground-muted">
							Atualizado {formatDate(quote.updated_at)}
						</Text>
					</View>
					{expanded ? (
						<ChevronUp size={18} color={themeColors.foregroundMuted} />
					) : (
						<ChevronDown size={18} color={themeColors.foregroundMuted} />
					)}
				</View>
			</TouchableOpacity>

			{expanded && (
				<View className="gap-6 p-5 md:p-6">
					{feedbackMessage ? (
						<View className="rounded-lg border border-success/30 bg-success-soft p-3">
							<Text className="font-inter text-sm text-success-text">
								{feedbackMessage}
							</Text>
						</View>
					) : null}

					{lockedMessage ? (
						<View className="gap-3 rounded-lg border border-border bg-surface-subtle p-3">
							<View className="flex-row items-start gap-2">
								<Lock size={16} color={themeColors.foregroundSecondary} />
								<Text className="flex-1 font-inter text-sm text-foreground-secondary">
									{lockedMessage}
								</Text>
							</View>
							{canReopenQuote && !isEditing ? (
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel={`Reabrir orçamento ${shortId(quote.id)}`}
									disabled={updating}
									onPress={() => setReopenDialogOpen(true)}
									className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-warning/40 bg-surface px-3 py-2"
								>
									<RotateCcw size={16} color={themeColors.warningText} />
									<Text className="font-inter-medium text-sm text-warning-text">
										Reabrir orçamento
									</Text>
								</TouchableOpacity>
							) : null}
						</View>
					) : null}

					{isDraft && !isEditing ? (
						<View className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4">
							<Text className="font-inter-semibold text-sm text-foreground">
								Orçamento em preparação
							</Text>
							<Text className="mt-1 font-inter text-sm text-foreground-secondary">
								Revise os dados e envie o orçamento ao cliente. Ele recebe um
								e-mail com os valores, a validade e um link para aprovar ou
								reprovar. Depois do envio, o orçamento fica bloqueado para
								edição.
							</Text>
							{!quote.company_id && (
								<View className="mt-3 flex-row items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
									<CircleAlert size={16} color={themeColors.warningText} />
									<Text className="flex-1 font-inter text-sm text-warning-text">
										Vincule uma empresa a este orçamento antes de enviá-lo.
									</Text>
								</View>
							)}
							{quote.company_id && quote.items.length === 0 && (
								<View className="mt-3 flex-row items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
									<CircleAlert size={16} color={themeColors.warningText} />
									<Text className="flex-1 font-inter text-sm text-warning-text">
										Adicione ao menos um documento ao orçamento antes de
										enviá-lo.
									</Text>
								</View>
							)}
							{quote.company_id && hasItemWithoutFile && (
								<View className="mt-3 flex-row items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
									<CircleAlert size={16} color={themeColors.warningText} />
									<Text className="flex-1 font-inter text-sm text-warning-text">
										Anexe o arquivo de todos os documentos antes de enviar o
										orçamento.
									</Text>
								</View>
							)}
							{sendError ? (
								<Text className="mt-3 font-inter text-sm text-danger">
									{sendError}
								</Text>
							) : null}
							<TouchableOpacity
								accessibilityRole="button"
								disabled={updating || !canWriteQuotes || !canSendQuote}
								onPress={() => {
									setSendError('');
									setSendDialogOpen(true);
								}}
								className={`mt-4 flex-row items-center gap-2 self-start rounded-lg px-4 py-2.5 ${updating || !canSendQuote ? 'bg-border-strong' : 'bg-primary'} ${!canWriteQuotes || !canSendQuote ? 'opacity-40' : ''}`}
							>
								<Send size={15} color={themeColors.primaryForeground} />
								<Text className="font-inter-medium text-sm text-primary-foreground">
									{updating ? 'Enviando...' : 'Enviar orçamento ao cliente'}
								</Text>
							</TouchableOpacity>
						</View>
					) : null}

					{quote.service_order_id ? (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={`Abrir ordem de serviço do orçamento ${shortId(quote.id)}`}
							onPress={onOpenServiceOrder}
							className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-primary/30 px-3 py-2"
						>
							<FileText size={16} color={themeColors.primaryText} />
							<Text className="font-inter-medium text-sm text-primary-text">
								Abrir ordem de serviço
							</Text>
						</TouchableOpacity>
					) : null}

					{quote.status === 'pending' && !isEditing ? (
						<View className="rounded-xl border border-primary/30 bg-primary-soft/60 p-4">
							<Text className="font-inter-semibold text-sm text-foreground">
								Aguardando resposta do cliente
							</Text>
							<Text className="mt-1 font-inter text-sm text-foreground-secondary">
								{quote.sent_to_customer_email
									? `Enviado para ${quote.sent_to_customer_email}${quote.sent_to_customer_at ? ` em ${formatDate(quote.sent_to_customer_at)}` : ''}. `
									: ''}
								O cliente aprova ou reprova pelo link do e-mail. Se a resposta
								chegar por outro canal, registre a decisão aqui.
							</Text>
							{decisionError ? (
								<Text className="mt-3 font-inter text-sm text-danger">
									{decisionError}
								</Text>
							) : null}
							{rejectionFormOpen ? (
								<View className="mt-4 gap-3">
									<TextInput
										value={reprovalReason}
										onChangeText={(value) => {
											setReprovalReason(value);
											setDecisionError('');
										}}
										maxLength={500}
										multiline
										textAlignVertical="top"
										placeholder="Motivo da reprovação"
										className="min-h-24 rounded-lg border border-border-strong bg-surface px-3 py-2 font-inter text-sm text-foreground"
									/>
									<View className="flex-row flex-wrap gap-3">
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating || !canApproveQuotes}
											onPress={() => {
												if (updating || !canApproveQuotes) return;
												if (!reprovalReason.trim()) {
													setDecisionError('Informe o motivo da reprovação.');
													return;
												}
												void onDecide('reproved', reprovalReason.trim()).then(
													(message) => {
														if (message) setDecisionError(message);
														else setRejectionFormOpen(false);
													},
												);
											}}
											className={`rounded-lg px-4 py-2.5 ${updating ? 'bg-border-strong' : 'bg-danger'}`}
										>
											<Text className="font-inter-medium text-sm text-primary-foreground">
												{updating ? 'Salvando...' : 'Confirmar reprovação'}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating}
											onPress={() => setRejectionFormOpen(false)}
											className="rounded-lg border border-border-strong px-4 py-2.5"
										>
											<Text className="font-inter-medium text-sm text-foreground-secondary">
												Cancelar
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							) : (
								<View className="mt-4 gap-3">
									{!quote.company_id && (
										<View className="flex-row items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
											<CircleAlert size={16} color={themeColors.warningText} />
											<Text className="flex-1 font-inter text-sm text-warning-text">
												Vincule uma empresa a este orçamento antes de aprová-lo.
												Reabra o orçamento para fazer o ajuste.
											</Text>
										</View>
									)}
									{quote.company_id && quote.items.length === 0 && (
										<View className="flex-row items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft p-3">
											<CircleAlert size={16} color={themeColors.warningText} />
											<Text className="flex-1 font-inter text-sm text-warning-text">
												Adicione ao menos um documento ao orçamento antes de
												aprová-lo. Reabra o orçamento para fazer o ajuste.
											</Text>
										</View>
									)}
									<View className="flex-row flex-wrap gap-3">
										<TouchableOpacity
											accessibilityRole="button"
											disabled={
												updating || !canApproveQuotes || !canApproveQuote
											}
											onPress={() => {
												if (updating || !canApproveQuotes || !canApproveQuote)
													return;
												void onDecide('approved').then((message) => {
													if (message) setDecisionError(message);
												});
											}}
											className={`rounded-lg px-4 py-2.5 ${updating || !canApproveQuote ? 'bg-border-strong' : 'bg-success'} ${!canApproveQuotes || !canApproveQuote ? 'opacity-40' : ''}`}
										>
											<Text className="font-inter-medium text-sm text-primary-foreground">
												{updating ? 'Salvando...' : 'Aprovar orçamento'}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating || !canApproveQuotes}
											onPress={() => setRejectionFormOpen(true)}
											className={`rounded-lg border border-danger/30 px-4 py-2.5 ${!canApproveQuotes ? 'opacity-40' : ''}`}
										>
											<Text className="font-inter-medium text-sm text-danger">
												Reprovar orçamento
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							)}
						</View>
					) : null}
					{quote.status === 'reproved' ? (
						<View className="rounded-xl border border-danger/30 bg-danger-soft p-4">
							<Text className="font-inter-semibold text-sm text-danger-text">
								Motivo da reprovação
							</Text>
							<Text className="mt-1 font-inter text-sm text-danger-text">
								{quote.reproval_reason || 'Motivo não informado'}
							</Text>
							{quote.reproved_at ? (
								<Text className="mt-2 font-inter text-xs text-danger">
									Reprovado em {formatDate(quote.reproved_at)}
								</Text>
							) : null}
							<Text className="mt-2 font-inter text-xs text-danger">
								Reprovado por:{' '}
								{quote.reproved_by_email || 'Responsável não identificado'}
							</Text>
						</View>
					) : null}
					{quote.status === 'approved' ? (
						<View className="gap-1">
							{quote.approved_at ? (
								<Text className="font-inter text-xs text-success-text">
									Aprovado em {formatDate(quote.approved_at)}
								</Text>
							) : null}
							<Text className="font-inter text-xs text-success-text">
								Aprovado por:{' '}
								{quote.approved_by_email || 'Responsável não identificado'}
							</Text>
							{quote.terms_accepted_at ? (
								<Text
									testID="quote-terms-accepted"
									className="font-inter text-xs text-success-text"
								>
									Termos e condições aceitos pelo cliente em{' '}
									{formatDate(quote.terms_accepted_at)}
								</Text>
							) : null}
						</View>
					) : null}
					{quote.status === 'approved' && !isEditing ? (
						<QuoteReceiptSection
							quote={quote}
							company={companies.find(
								(company) => company.id === quote.company_id,
							)}
							additionalServices={additionalServices}
						/>
					) : null}

					{saveError ? (
						<Text className="font-inter text-sm text-danger">{saveError}</Text>
					) : null}

					<View>
						<View className="mb-4 flex-row items-center justify-between">
							<SectionTitle>Cliente</SectionTitle>
							{!isEditing && isDraft && (
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel="Editar orçamento"
									onPress={startEditing}
									disabled={!canEditQuote}
									className={`h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-surface-subtle ${!canEditQuote ? 'opacity-40' : ''}`}
								>
									<Pencil size={14} color={themeColors.foregroundMuted} />
								</TouchableOpacity>
							)}
						</View>
						{isEditing ? (
							<View className="flex-row flex-wrap gap-x-5 gap-y-4">
								<EditField
									label="Contato"
									value={customerName}
									onChangeText={setCustomerName}
								/>
								<EditField
									label="E-mail"
									value={email}
									onChangeText={setEmail}
									keyboardType="email-address"
								/>
								<CompanyLinkField
									companies={companies}
									companyId={companyId}
									onSelectCompany={setCompanyId}
									onRequestCreate={requestCreateCompany}
								/>
							</View>
						) : (
							<View className="flex-row flex-wrap gap-x-5 gap-y-4">
								<QuoteField
									label="Contato"
									value={display(quote.customer_name)}
								/>
								<QuoteField label="E-mail" value={display(quote.email)} />
								<QuoteField
									label="Empresa"
									value={
										companies.find((company) => company.id === quote.company_id)
											?.trade_name ?? display(quote.enterprise)
									}
								/>
							</View>
						)}
					</View>

					<View>
						<SectionTitle>
							Documentos ({isEditing ? draftItems.length : quote.items.length})
						</SectionTitle>
						<WordCountSummary items={isEditing ? draftItems : quote.items} />
						{isEditing ? (
							<View className="gap-3">
								{draftItems.map((item) => (
									<View
										key={item.id}
										className="gap-3 rounded-xl border border-border bg-surface p-4"
									>
										<View className="flex-row flex-wrap gap-x-5 gap-y-3">
											<View className="w-full gap-1 md:w-[47%]">
												<Text className="font-inter-medium text-xs text-foreground-muted">
													Idioma de origem
												</Text>
												<LanguageSelect
													value={item.source_language}
													onChange={(value) =>
														updateDraftItem(item.id, { source_language: value })
													}
												/>
											</View>
											<View className="w-full gap-1 md:w-[47%]">
												<Text className="font-inter-medium text-xs text-foreground-muted">
													Idioma de destino
												</Text>
												<LanguageSelect
													value={item.target_language}
													onChange={(value) =>
														updateDraftItem(item.id, { target_language: value })
													}
												/>
											</View>
											<EditField
												label="Tipo de documento"
												value={item.document_type}
												onChangeText={(value) =>
													updateDraftItem(item.id, { document_type: value })
												}
											/>
											<CurrencyField
												label="Preço estimado"
												value={item.estimated_value}
												onChangeValue={(value) =>
													updateDraftItem(item.id, { estimated_value: value })
												}
											/>
											<WordCountField
												value={item.word_count}
												hasFile={Boolean(item.file_url)}
												onChangeValue={(value) =>
													updateDraftItem(item.id, { word_count: value })
												}
											/>
										</View>
										<View className="flex-row items-center gap-3 border-t border-border-subtle pt-3">
											{!item.file_url && (
												<TouchableOpacity
													accessibilityRole="button"
													accessibilityLabel="Anexar arquivo"
													disabled={
														uploadingItemId === item.id || !canWriteDocuments
													}
													onPress={() => void handlePickItemFile(item.id)}
													className={`shrink-0 flex-row items-center gap-2 ${!canWriteDocuments ? 'opacity-40' : ''}`}
												>
													<Paperclip
														size={14}
														color={themeColors.primaryText}
													/>
													<Text className="font-inter-medium text-sm text-primary-text">
														{uploadingItemId === item.id
															? 'Enviando...'
															: 'Anexar arquivo'}
													</Text>
												</TouchableOpacity>
											)}
											{item.file_url && (
												<TouchableOpacity
													accessibilityRole="link"
													accessibilityLabel={`Visualizar arquivo ${getFileName(item.file_url)}`}
													onPress={() => openDocument(item.file_url!)}
													className="min-w-0 flex-1 flex-row items-center gap-2"
												>
													<Text
														className="min-w-0 flex-1 font-inter-medium text-sm text-primary-text"
														numberOfLines={1}
														ellipsizeMode="tail"
													>
														{getFileName(item.file_url)}
													</Text>
													<ExternalLink
														size={14}
														color={themeColors.primaryText}
													/>
												</TouchableOpacity>
											)}
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel="Remover item"
												onPress={() => removeDraftItem(item.id)}
												className="h-8 w-8 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft"
											>
												<Trash2 size={14} color={themeColors.danger} />
											</TouchableOpacity>
										</View>
									</View>
								))}
								<TouchableOpacity
									accessibilityRole="button"
									onPress={addDraftItem}
									className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-dashed border-border-strong px-4 py-2.5"
								>
									<Plus size={15} color={themeColors.foregroundSecondary} />
									<Text className="font-inter-medium text-sm text-foreground-secondary">
										Adicionar item
									</Text>
								</TouchableOpacity>
							</View>
						) : quote.items.length ? (
							<View className="gap-3">
								{quote.items.map((item) => (
									<View
										key={item.id}
										className="rounded-xl border border-border p-4"
									>
										<View className="flex-row flex-wrap items-start justify-between gap-3">
											<View className="flex-row flex-1 items-center gap-3">
												<View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-muted">
													<FileText
														size={17}
														color={themeColors.foregroundSecondary}
													/>
												</View>
												<View className="min-w-0 flex-1">
													<Text className="font-inter-semibold text-sm text-foreground">
														{display(item.document_type)}
													</Text>
													<Text className="mt-1 font-inter text-xs text-foreground-muted">
														{item.source_language} → {item.target_language}
													</Text>
												</View>
											</View>
											<Text className="rounded-lg bg-primary-soft px-3 py-2 font-inter-semibold text-sm text-primary-text">
												{formatPrice(item.estimated_value)}
											</Text>
										</View>

										<View className="mt-4 border-t border-border-subtle pt-3">
											<Text className="mb-1 font-inter-medium text-xs text-foreground-muted">
												Arquivo
											</Text>
											{item.file_url ? (
												<TouchableOpacity
													accessibilityRole="link"
													accessibilityLabel={`Abrir documento ${getFileName(item.file_url)}`}
													onPress={() => openDocument(item.file_url!)}
													className="min-w-0 flex-1 flex-row items-center gap-2"
												>
													<Text
														className="min-w-0 flex-1 font-inter-medium text-sm text-primary-text"
														numberOfLines={2}
														ellipsizeMode="tail"
													>
														{getFileName(item.file_url)}
													</Text>
													<View className="flex-shrink-0">
														<ExternalLink
															size={14}
															color={themeColors.primaryText}
														/>
													</View>
												</TouchableOpacity>
											) : (
												<Text className="font-inter text-sm text-foreground-subtle">
													Arquivo ainda não anexado
												</Text>
											)}
											{item.file_url ? (
												<Text
													testID="quote-item-word-count"
													className="mt-2 font-inter text-xs text-foreground-secondary"
												>
													{item.word_count != null
														? formatWordCount(item.word_count)
														: 'Não foi possível contar as palavras deste arquivo'}
												</Text>
											) : null}
											<Text className="mt-2 font-inter text-xs text-foreground-subtle">
												Criado {formatDate(item.created_at)} · Atualizado{' '}
												{formatDate(item.updated_at)}
											</Text>
										</View>
									</View>
								))}
							</View>
						) : (
							<Text className="font-inter text-sm text-foreground-muted">
								Este orçamento ainda não possui documentos.
							</Text>
						)}
					</View>

					<View>
						<SectionTitle>
							Serviços adicionais ({additionalServices.length})
						</SectionTitle>
						<View className="gap-3">
							{isEditing && additionalServices.length ? (
								additionalServices.map((service) => {
									const draft = draftAdditionalServices.find(
										(item) => item.id === service.id,
									);
									return draft ? (
										<View
											key={draft.id}
											className="flex-row flex-wrap gap-x-5 gap-y-3 rounded-xl border border-border bg-surface p-4"
										>
											<EditField
												label="Descrição do serviço"
												value={draft.description}
												onChangeText={(value) =>
													updateDraftAdditionalService(draft.id, {
														description: value,
													})
												}
											/>
											<CurrencyField
												label="Valor do serviço"
												value={draft.price}
												onChangeValue={(value) =>
													updateDraftAdditionalService(draft.id, {
														price: value,
													})
												}
											/>
										</View>
									) : (
										<AdditionalServiceCard key={service.id} service={service} />
									);
								})
							) : additionalServicesLoading ? (
								<Text className="font-inter text-sm text-foreground-muted">
									Carregando serviços adicionais...
								</Text>
							) : additionalServicesError ? (
								<Text className="font-inter text-sm text-danger">
									{additionalServicesError}
								</Text>
							) : additionalServices.length ? (
								additionalServices.map((service) => (
									<AdditionalServiceCard
										key={service.id}
										service={service}
										onMarkAsCompleted={
											canEditQuote
												? () => handleCompleteAdditionalService(service)
												: undefined
										}
									/>
								))
							) : (
								<Text className="font-inter text-sm text-foreground-muted">
									Este orçamento ainda não possui serviços adicionais.
								</Text>
							)}
							{!isEditing && isDraft && (
								<TouchableOpacity
									accessibilityRole="button"
									onPress={() => setShowAdditionalServiceModal(true)}
									disabled={!canEditQuote}
									className={`flex-row items-center justify-center gap-2 self-start rounded-lg border border-dashed border-border-strong px-4 py-2.5 ${!canEditQuote ? 'opacity-40' : ''}`}
								>
									<Plus size={15} color={themeColors.foregroundSecondary} />
									<Text className="font-inter-medium text-sm text-foreground-secondary">
										Novo serviço adicional
									</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>

					{quote.service_order_id ? (
						<View>
							<SectionTitle>
								Itens da ordem de serviço ({serviceOrderItems.length})
							</SectionTitle>
							{serviceOrderItemsLoading ? (
								<Text className="font-inter text-sm text-foreground-muted">
									Carregando itens da ordem de serviço...
								</Text>
							) : serviceOrderItemsError ? (
								<Text className="font-inter text-sm text-danger">
									{serviceOrderItemsError}
								</Text>
							) : (
								<ItemsTable
									items={serviceOrderItems}
									translatorsById={translatorsById}
									isInServiceOrder
									layout="cards"
								/>
							)}
						</View>
					) : null}

					{isEditing ? (
						<View className="flex-row flex-wrap gap-3 border-t border-border-subtle pt-4">
							<TouchableOpacity
								accessibilityRole="button"
								disabled={isSaving || !canWriteQuotes}
								accessibilityState={{ disabled: isSaving || !canWriteQuotes }}
								onPress={() => void handleSave()}
								className={`rounded-lg px-5 py-2.5 ${isSaving || !canWriteQuotes ? 'bg-border-strong' : 'bg-primary'}`}
							>
								<Text className="font-inter-semibold text-sm text-primary-foreground">
									{isSaving ? 'Salvando...' : 'Salvar alterações'}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								accessibilityRole="button"
								disabled={isSaving}
								onPress={cancelEditing}
								className="flex-row items-center gap-1.5 rounded-lg border border-border-strong px-5 py-2.5"
							>
								<X size={14} color={themeColors.foregroundSecondary} />
								<Text className="font-inter-medium text-sm text-foreground-secondary">
									Cancelar
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityState={{ expanded: showTechnicalDetails }}
							onPress={() => setShowTechnicalDetails((visible) => !visible)}
							className="flex-row items-center gap-2 self-start border-t border-border-subtle pt-4"
						>
							{showTechnicalDetails ? (
								<ChevronUp size={16} color={themeColors.foregroundMuted} />
							) : (
								<ChevronDown size={16} color={themeColors.foregroundMuted} />
							)}
							<Text className="font-inter-medium text-xs text-foreground-muted">
								{showTechnicalDetails
									? 'Ocultar referências técnicas'
									: 'Ver referências técnicas'}
							</Text>
						</TouchableOpacity>
					)}
					{!isEditing && showTechnicalDetails && (
						<View className="gap-2 rounded-lg bg-surface-subtle p-3">
							<Text
								selectable
								className="font-inter text-xs text-foreground-muted"
							>
								ID do orçamento: {quote.id}
							</Text>
							{quote.request_id && (
								<Text
									selectable
									className="font-inter text-xs text-foreground-muted"
								>
									ID da solicitação: {quote.request_id}
								</Text>
							)}
							{quote.items.map((item) => (
								<View key={item.id} className="gap-1">
									<Text
										selectable
										className="font-inter text-xs text-foreground-muted"
									>
										ID do documento: {item.id}
									</Text>
								</View>
							))}
						</View>
					)}
				</View>
			)}

			<AdditionalServiceFormModal
				visible={showAdditionalServiceModal}
				onClose={() => setShowAdditionalServiceModal(false)}
				onSubmit={handleCreateAdditionalService}
			/>

			<SendQuoteDialog
				visible={sendDialogOpen}
				quoteLabel={shortId(quote.id)}
				validUntil={quote.valid_until ? formatDay(quote.valid_until) : null}
				sending={updating}
				isResend={Boolean(quote.sent_to_customer_at)}
				onConfirm={() => void handleSend()}
				onCancel={() => setSendDialogOpen(false)}
			/>

			<ReopenQuoteDialog
				visible={reopenDialogOpen}
				quoteLabel={shortId(quote.id)}
				onCancel={() => setReopenDialogOpen(false)}
				onConfirm={handleReopen}
			/>

			<CompanyFormModal
				visible={showCreateCompany}
				onClose={() => setShowCreateCompany(false)}
				onSubmit={handleCreateCompany}
				toast={
					createCompanyError
						? { message: createCompanyError, type: 'error' }
						: null
				}
				initialValues={{
					trade_name: createCompanySeed,
					legal_name: createCompanySeed,
					email: email.trim(),
				}}
			/>
		</View>
	);
}
