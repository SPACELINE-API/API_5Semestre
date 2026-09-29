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
	Plus,
	Search,
	Trash2,
	X,
} from 'lucide-react-native';
import type { ManagedQuote, QuoteManagerItem } from '../services/quotesService';
import {
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

const statusStyles: Record<string, { label: string; classes: string }> = {
	approved: { label: 'Aprovado', classes: 'bg-emerald-50 text-emerald-700' },
	pending: { label: 'Pendente', classes: 'bg-gray-100 text-gray-700' },
	reproved: { label: 'Reprovado', classes: 'bg-red-50 text-red-700' },
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

function display(value: string | null | undefined) {
	return value?.trim() || 'Não informado';
}

function shortId(value: string) {
	return value.slice(0, 8).toUpperCase();
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
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<Text selectable className="font-inter text-sm leading-5 text-gray-900">
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
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<TextInput
				value={value}
				onChangeText={onChangeText}
				keyboardType={keyboardType}
				className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
			/>
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
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<TextInput
				value={value ? decimalStringToBRL(value) : ''}
				onChangeText={(text) => onChangeValue(maskCurrencyDigits(text))}
				keyboardType="numeric"
				placeholder="R$ 0,00"
				placeholderTextColor="#9CA3AF"
				className="rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
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
			<Text className="font-inter-medium text-xs text-gray-500">
				Empresa vinculada
			</Text>
			<View ref={triggerRef} collapsable={false}>
				{selected ? (
					<View className="flex-row items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2">
						<Text className="font-inter text-sm text-gray-900">
							{selected.trade_name}
						</Text>
						<TouchableOpacity accessibilityRole="button" onPress={openPicker}>
							<Text className="font-inter-medium text-xs text-blue-600">
								Trocar
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity
						accessibilityRole="button"
						onPress={openPicker}
						className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5"
					>
						<Building2 size={14} color="#6b7280" />
						<Text className="font-inter-medium text-sm text-gray-600">
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
						className="absolute rounded-lg border border-gray-200 bg-white shadow-sm"
						style={{
							top: anchor.y + anchor.height + 4,
							left: anchor.x,
							width: anchor.width,
							maxHeight: 280,
							backgroundColor: 'white',
						}}
					>
						<View className="flex-row items-center gap-2 border-b border-gray-100 px-3 py-2">
							<Search size={14} color="#9CA3AF" />
							<TextInput
								autoFocus
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar empresa"
								placeholderTextColor="#9CA3AF"
								className="flex-1 font-inter text-sm text-gray-800 max-md:min-w-0 max-md:shrink max-md:leading-5"
							/>
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Fechar busca de empresa"
								onPress={closePicker}
							>
								<X size={14} color="#6b7280" />
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
									className="border-b border-gray-50 px-3 py-2"
								>
									<Text className="font-inter text-sm text-gray-800">
										{company.trade_name}
									</Text>
									<Text className="font-inter text-xs text-gray-400">
										{company.legal_name}
									</Text>
								</TouchableOpacity>
							))}
							{filtered.length === 0 && (
								<Text className="px-3 py-3 font-inter text-sm text-gray-400">
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
							className="flex-row items-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2.5"
						>
							<Plus size={14} color="#1d4ed8" />
							<Text className="font-inter-medium text-xs text-blue-700">
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
		<Text className="mb-4 font-inter-semibold text-sm text-gray-900">
			{children}
		</Text>
	);
}

type DraftItem = {
	id: string;
	isNew: boolean;
	source_language: string;
	target_language: string;
	document_type: string;
	estimated_value: string;
	file_url: string | null;
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
	};
}

export function QuoteCard({
	quote,
	onDecide,
	onOpenServiceOrder,
	onQuoteChange,
	updating,
}: {
	quote: ManagedQuote;
	onDecide: (
		status: 'approved' | 'reproved',
		reason?: string,
	) => Promise<string | null>;
	onOpenServiceOrder: () => void;
	onQuoteChange: (quote: ManagedQuote) => void;
	updating: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
	const [rejectionFormOpen, setRejectionFormOpen] = useState(false);
	const [reprovalReason, setReprovalReason] = useState('');
	const [decisionError, setDecisionError] = useState('');

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

	useEffect(() => {
		listCompanies()
			.then(setCompanies)
			.catch(() => setCompanies([]));
	}, []);

	const status = statusStyles[quote.status.toLowerCase()] ?? {
		label: quote.status,
		classes: 'bg-gray-100 text-gray-700',
	};

	function startEditing() {
		setCustomerName(quote.customer_name ?? '');
		setEnterprise(quote.enterprise ?? '');
		setEmail(quote.email ?? '');
		setOriginalLanguage(quote.original_language ?? '');
		setTranslationLanguage(quote.translation_language ?? '');
		setCustomerNeed(quote.customer_need ?? '');
		setDraftItems(quote.items.map(toDraftItem));
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
			},
		]);
	}

	function requestCreateCompany(searchText: string) {
		setCreateCompanySeed(searchText || enterprise);
		setCreateCompanyError(null);
		setShowCreateCompany(true);
	}

	async function handleCreateCompany(data: CompanyCreateInput) {
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

	async function handlePickItemFile(itemId: string) {
		const file = await pickDocument();
		if (!file) return;

		setUploadingItemId(itemId);
		try {
			const fileUrl = await uploadQuoteDocument(file.uri, file.name);
			if (fileUrl) {
				updateDraftItem(itemId, { file_url: fileUrl });
			} else {
				setSaveError('Não foi possível enviar o arquivo. Tente novamente.');
			}
		} finally {
			setUploadingItemId(null);
		}
	}

	async function handleSave() {
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
					};
					return draft.isNew
						? createQuoteItem(quote.id, {
								source_language: payload.source_language,
								target_language: payload.target_language,
								document_type: payload.document_type ?? undefined,
								file_url: payload.file_url ?? undefined,
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

			onQuoteChange({ ...quote, ...quoteResult.data, items: savedItems });
			setIsEditing(false);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<View className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
			<TouchableOpacity
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				accessibilityLabel={`${expanded ? 'Recolher' : 'Expandir'} orçamento ${shortId(quote.id)}`}
				onPress={() => setExpanded((current) => !current)}
				className="flex-row flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 md:px-6"
			>
				<View className="flex-row items-center gap-3">
					<View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
						<FileText size={21} color="#2563eb" />
					</View>
					<View className="gap-1">
						<Text className="font-inter-bold text-base text-gray-900">
							Orçamento #{shortId(quote.id)}
						</Text>
						<View className="flex-row items-center gap-2">
							<View
								className={`rounded-full px-2.5 py-1 ${status.classes.split(' ')[0]}`}
							>
								<Text
									className={`font-inter-medium text-xs ${status.classes.split(' ')[1]}`}
								>
									{status.label}
								</Text>
							</View>
							<Text className="font-inter text-xs text-gray-500">
								{quote.request_id
									? 'Vinculado a uma solicitação'
									: 'Criado manualmente'}
							</Text>
						</View>
					</View>
				</View>
				<View className="flex-row flex-wrap items-center gap-3">
					<View className="flex-row items-center gap-2">
						<CalendarDays size={15} color="#6b7280" />
						<Text className="font-inter text-xs text-gray-500">
							Atualizado {formatDate(quote.updated_at)}
						</Text>
					</View>
					{expanded ? (
						<ChevronUp size={18} color="#6b7280" />
					) : (
						<ChevronDown size={18} color="#6b7280" />
					)}
				</View>
			</TouchableOpacity>

			{expanded && (
				<View className="gap-6 p-5 md:p-6">
					{quote.status === 'approved' && quote.service_order_id ? (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={`Abrir ordem de serviço do orçamento ${shortId(quote.id)}`}
							onPress={onOpenServiceOrder}
							className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-blue-200 px-3 py-2"
						>
							<FileText size={16} color="#1d4ed8" />
							<Text className="font-inter-medium text-sm text-blue-700">
								Abrir ordem de serviço
							</Text>
						</TouchableOpacity>
					) : null}

					{quote.status === 'pending' && !isEditing ? (
						<View className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
							<Text className="font-inter-semibold text-sm text-gray-900">
								Decisão do orçamento
							</Text>
							<Text className="mt-1 font-inter text-sm text-gray-600">
								Aprove este orçamento ou registre o motivo da reprovação.
							</Text>
							{decisionError ? (
								<Text className="mt-3 font-inter text-sm text-red-700">
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
										className="min-h-24 rounded-lg border border-gray-300 bg-white px-3 py-2 font-inter text-sm text-gray-900"
									/>
									<View className="flex-row flex-wrap gap-3">
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating}
											onPress={() => {
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
											className={`rounded-lg px-4 py-2.5 ${updating ? 'bg-gray-300' : 'bg-red-600'}`}
										>
											<Text className="font-inter-medium text-sm text-white">
												{updating ? 'Salvando...' : 'Confirmar reprovação'}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating}
											onPress={() => setRejectionFormOpen(false)}
											className="rounded-lg border border-gray-300 px-4 py-2.5"
										>
											<Text className="font-inter-medium text-sm text-gray-700">
												Cancelar
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							) : (
								<View className="mt-4 gap-3">
									{!quote.company_id && (
										<View className="flex-row items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
											<CircleAlert size={16} color="#b45309" />
											<Text className="flex-1 font-inter text-sm text-amber-800">
												Vincule uma empresa a este orçamento antes de aprová-lo.
											</Text>
										</View>
									)}
									<View className="flex-row flex-wrap gap-3">
										{quote.company_id ? (
											<TouchableOpacity
												accessibilityRole="button"
												disabled={updating}
												onPress={() =>
													void onDecide('approved').then((message) => {
														if (message) setDecisionError(message);
													})
												}
												className={`rounded-lg px-4 py-2.5 ${updating ? 'bg-gray-300' : 'bg-emerald-600'}`}
											>
												<Text className="font-inter-medium text-sm text-white">
													{updating ? 'Salvando...' : 'Aprovar orçamento'}
												</Text>
											</TouchableOpacity>
										) : (
											<TouchableOpacity
												accessibilityRole="button"
												onPress={startEditing}
												className="rounded-lg bg-blue-600 px-4 py-2.5"
											>
												<Text className="font-inter-medium text-sm text-white">
													Vincular empresa
												</Text>
											</TouchableOpacity>
										)}
										<TouchableOpacity
											accessibilityRole="button"
											disabled={updating}
											onPress={() => setRejectionFormOpen(true)}
											className="rounded-lg border border-red-200 px-4 py-2.5"
										>
											<Text className="font-inter-medium text-sm text-red-700">
												Reprovar orçamento
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							)}
						</View>
					) : null}
					{quote.status === 'reproved' ? (
						<View className="rounded-xl border border-red-200 bg-red-50 p-4">
							<Text className="font-inter-semibold text-sm text-red-900">
								Motivo da reprovação
							</Text>
							<Text className="mt-1 font-inter text-sm text-red-800">
								{quote.reproval_reason || 'Motivo não informado'}
							</Text>
							{quote.reproved_at ? (
								<Text className="mt-2 font-inter text-xs text-red-700">
									Reprovado em {formatDate(quote.reproved_at)}
								</Text>
							) : null}
							<Text className="mt-2 font-inter text-xs text-red-700">
								Reprovado por:{' '}
								{quote.reproved_by_email || 'Responsável não identificado'}
							</Text>
						</View>
					) : null}
					{quote.status === 'approved' ? (
						<View className="gap-1">
							{quote.approved_at ? (
								<Text className="font-inter text-xs text-emerald-700">
									Aprovado em {formatDate(quote.approved_at)}
								</Text>
							) : null}
							<Text className="font-inter text-xs text-emerald-700">
								Aprovado por:{' '}
								{quote.approved_by_email || 'Responsável não identificado'}
							</Text>
						</View>
					) : null}

					{saveError ? (
						<Text className="font-inter text-sm text-red-700">{saveError}</Text>
					) : null}

					<View>
						<View className="mb-4 flex-row items-center justify-between">
							<SectionTitle>Cliente</SectionTitle>
							{!isEditing && (
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel="Editar orçamento"
									onPress={startEditing}
									className="h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
								>
									<Pencil size={14} color="#6B7280" />
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

					<View className="rounded-xl bg-gray-50 p-4">
						<SectionTitle>Solicitação de tradução</SectionTitle>
						{isEditing ? (
							<View className="flex-row flex-wrap gap-x-5 gap-y-4">
								<EditField
									label="Idioma de origem"
									value={originalLanguage}
									onChangeText={setOriginalLanguage}
								/>
								<EditField
									label="Idioma de destino"
									value={translationLanguage}
									onChangeText={setTranslationLanguage}
								/>
								<EditField
									label="Necessidade"
									value={customerNeed}
									onChangeText={setCustomerNeed}
								/>
							</View>
						) : (
							<View className="flex-row flex-wrap gap-x-5 gap-y-4">
								<QuoteField
									label="Idioma de origem"
									value={display(quote.original_language)}
								/>
								<QuoteField
									label="Idioma de destino"
									value={display(quote.translation_language)}
								/>
								<QuoteField
									label="Necessidade"
									value={display(quote.customer_need)}
								/>
							</View>
						)}
					</View>

					<View>
						<SectionTitle>
							Documentos ({isEditing ? draftItems.length : quote.items.length})
						</SectionTitle>
						{isEditing ? (
							<View className="gap-3">
								{draftItems.map((item) => (
									<View
										key={item.id}
										className="gap-3 rounded-xl border border-gray-200 bg-white p-4"
									>
										<View className="flex-row flex-wrap gap-x-5 gap-y-3">
											<EditField
												label="Idioma de origem"
												value={item.source_language}
												onChangeText={(value) =>
													updateDraftItem(item.id, { source_language: value })
												}
											/>
											<EditField
												label="Idioma de destino"
												value={item.target_language}
												onChangeText={(value) =>
													updateDraftItem(item.id, { target_language: value })
												}
											/>
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
										</View>
										<View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
											<TouchableOpacity
												accessibilityRole="button"
												disabled={uploadingItemId === item.id}
												onPress={() => void handlePickItemFile(item.id)}
												className="flex-row items-center gap-2"
											>
												<Paperclip size={14} color="#1d4ed8" />
												<Text className="font-inter-medium text-sm text-blue-700">
													{uploadingItemId === item.id
														? 'Enviando...'
														: item.file_url
															? getFileName(item.file_url)
															: 'Anexar arquivo'}
												</Text>
											</TouchableOpacity>
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel="Remover item"
												onPress={() => removeDraftItem(item.id)}
												className="h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50"
											>
												<Trash2 size={14} color="#b91c1c" />
											</TouchableOpacity>
										</View>
									</View>
								))}
								<TouchableOpacity
									accessibilityRole="button"
									onPress={addDraftItem}
									className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-dashed border-gray-300 px-4 py-2.5"
								>
									<Plus size={15} color="#374151" />
									<Text className="font-inter-medium text-sm text-gray-700">
										Adicionar item
									</Text>
								</TouchableOpacity>
							</View>
						) : quote.items.length ? (
							<View className="gap-3">
								{quote.items.map((item) => (
									<View
										key={item.id}
										className="rounded-xl border border-gray-200 p-4"
									>
										<View className="flex-row flex-wrap items-start justify-between gap-3">
											<View className="flex-row flex-1 items-center gap-3">
												<View className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
													<FileText size={17} color="#4b5563" />
												</View>
												<View className="min-w-0 flex-1">
													<Text className="font-inter-semibold text-sm text-gray-900">
														{display(item.document_type)}
													</Text>
													<Text className="mt-1 font-inter text-xs text-gray-500">
														{item.source_language} → {item.target_language}
													</Text>
												</View>
											</View>
											<Text className="rounded-lg bg-blue-50 px-3 py-2 font-inter-semibold text-sm text-blue-700">
												{formatPrice(item.estimated_value)}
											</Text>
										</View>

										<View className="mt-4 border-t border-gray-100 pt-3">
											<Text className="mb-1 font-inter-medium text-xs text-gray-500">
												Arquivo
											</Text>
											{item.file_url ? (
												<TouchableOpacity
													accessibilityRole="link"
													onPress={() => openDocument(item.file_url!)}
													className="flex-row items-center gap-2 self-start"
												>
													<Text className="font-inter-medium text-sm text-blue-700">
														{getFileName(item.file_url)}
													</Text>
													<ExternalLink size={14} color="#1d4ed8" />
												</TouchableOpacity>
											) : (
												<Text className="font-inter text-sm text-gray-400">
													Arquivo ainda não anexado
												</Text>
											)}
											<Text className="mt-2 font-inter text-xs text-gray-400">
												Criado {formatDate(item.created_at)} · Atualizado{' '}
												{formatDate(item.updated_at)}
											</Text>
										</View>
									</View>
								))}
							</View>
						) : (
							<Text className="font-inter text-sm text-gray-500">
								Este orçamento ainda não possui documentos.
							</Text>
						)}
					</View>

					{isEditing ? (
						<View className="flex-row flex-wrap gap-3 border-t border-gray-100 pt-4">
							<TouchableOpacity
								accessibilityRole="button"
								disabled={isSaving}
								onPress={() => void handleSave()}
								className={`rounded-lg px-5 py-2.5 ${isSaving ? 'bg-gray-300' : 'bg-blue-600'}`}
							>
								<Text className="font-inter-semibold text-sm text-white">
									{isSaving ? 'Salvando...' : 'Salvar alterações'}
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								accessibilityRole="button"
								disabled={isSaving}
								onPress={cancelEditing}
								className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-5 py-2.5"
							>
								<X size={14} color="#374151" />
								<Text className="font-inter-medium text-sm text-gray-700">
									Cancelar
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityState={{ expanded: showTechnicalDetails }}
							onPress={() => setShowTechnicalDetails((visible) => !visible)}
							className="flex-row items-center gap-2 self-start border-t border-gray-100 pt-4"
						>
							{showTechnicalDetails ? (
								<ChevronUp size={16} color="#6b7280" />
							) : (
								<ChevronDown size={16} color="#6b7280" />
							)}
							<Text className="font-inter-medium text-xs text-gray-500">
								{showTechnicalDetails
									? 'Ocultar referências técnicas'
									: 'Ver referências técnicas'}
							</Text>
						</TouchableOpacity>
					)}
					{!isEditing && showTechnicalDetails && (
						<View className="gap-2 rounded-lg bg-gray-50 p-3">
							<Text selectable className="font-inter text-xs text-gray-500">
								ID do orçamento: {quote.id}
							</Text>
							{quote.request_id && (
								<Text selectable className="font-inter text-xs text-gray-500">
									ID da solicitação: {quote.request_id}
								</Text>
							)}
							{quote.items.map((item) => (
								<View key={item.id} className="gap-1">
									<Text selectable className="font-inter text-xs text-gray-500">
										ID do documento: {item.id}
									</Text>
								</View>
							))}
						</View>
					)}
				</View>
			)}

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
