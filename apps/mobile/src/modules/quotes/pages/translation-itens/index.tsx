import { useEffect, useState } from 'react';
import {
	Platform,
	Dimensions,
	View,
	Text,
	TextInput,
	ScrollView,
	TouchableOpacity,
	Modal,
} from 'react-native';
import { LanguageSelect } from '../../components/LanguageSelect';
import {
	CircleAlert,
	CircleCheck,
	Paperclip,
	Trash2,
	X,
} from 'lucide-react-native';
import {
	createQuoteItem,
	createQuoteWithDetail,
	uploadQuoteDocument,
} from '../../services/quotesService';
import { CompanyLinkField } from '../../components/CompanyLinkField';
import { CompanyFormModal } from '../../../clients/components/CompanyFormModal';
import {
	createCompany,
	listCompanies,
} from '../../../clients/services/companyService';
import type {
	Company,
	CompanyCreateInput,
} from '../../../clients/types/company';
import { pickDocument } from '../../../../shared/utils/pickDocument';
import { openDocument } from '../../../../shared/components/FilePreview';
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../../shared/utils/currency';
import { usePermission } from '../../../auth/hooks/usePermission';
import {
	parseWordCountInput,
	WORD_COUNT_MAX_DIGITS,
	wordCountInputValue,
} from '../../utils/wordCount';
import { DateField } from '../../../../shared/components/DateField';
import {
	dateInputToIso,
	todayInputValue,
} from '../../../../shared/utils/dateOnly';

import { useThemeColors } from '../../../../shared/theme/ThemeProvider';
const { width } = Dimensions.get('window');
const isDesktop = Platform.OS === 'web' && width > 768;

type QuoteItem = {
	id: string;
	source: string;
	target: string;
	docType: string;
	price: string;
	fileName: string;
	fileUrl: string | null;
	wordCount: number | null;
};

function createEmptyItem(): QuoteItem {
	return {
		id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		source: '',
		target: '',
		docType: '',
		price: '',
		fileName: '',
		fileUrl: null,
		wordCount: null,
	};
}

export function NewQuoteModal({
	visible,
	onClose,
	onCreated,
}: {
	visible: boolean;
	onClose: () => void;
	onCreated: () => void;
}) {
	const themeColors = useThemeColors();
	const [items, setItems] = useState<QuoteItem[]>([createEmptyItem()]);
	const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const canWriteDocuments = usePermission('documents.write');
	const canWriteQuotes = usePermission('quotes.write');
	const [bannerMessage, setBannerMessage] = useState<string | null>(null);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [companyId, setCompanyId] = useState<string | null>(null);
	const [customerName, setCustomerName] = useState('');
	const [email, setEmail] = useState('');
	const [customerNeed, setCustomerNeed] = useState('');
	const [deadline, setDeadline] = useState('');
	const [showCreateCompany, setShowCreateCompany] = useState(false);
	const [createCompanySeed, setCreateCompanySeed] = useState('');
	const [createCompanyError, setCreateCompanyError] = useState<string | null>(
		null,
	);
	const canWriteClients = usePermission('clients.write');

	useEffect(() => {
		if (!visible) return;
		listCompanies()
			.then(setCompanies)
			.catch(() => setCompanies([]));
	}, [visible]);

	const requestCreateCompany = (searchText: string) => {
		if (!canWriteClients) return;
		setCreateCompanySeed(searchText);
		setCreateCompanyError(null);
		setShowCreateCompany(true);
	};

	const handleCreateCompany = async (data: CompanyCreateInput) => {
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
	};

	const handleAddItem = () => {
		setItems((current) => [...current, createEmptyItem()]);
	};

	const handleRemoveItem = (id: string) => {
		setItems((current) => current.filter((item) => item.id !== id));
	};

	const updateItem = (id: string, patch: Partial<QuoteItem>) => {
		setItems((current) =>
			current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
		);
	};

	const handlePickFile = async (itemId: string) => {
		if (!canWriteDocuments) return;
		const file = await pickDocument();
		if (!file) return;

		setUploadingItemId(itemId);
		try {
			const uploaded = await uploadQuoteDocument(file.uri, file.name);
			if (uploaded) {
				updateItem(itemId, {
					fileName: file.name,
					fileUrl: uploaded.file_url,
					wordCount: uploaded.word_count,
				});
			} else {
				setSubmitError('Não foi possível enviar o arquivo. Tente novamente.');
			}
		} finally {
			setUploadingItemId(null);
		}
	};

	const total = items.reduce(
		(sum, item) => sum + (item.price ? Number(item.price) : 0),
		0,
	);

	const resetFields = () => {
		setItems([createEmptyItem()]);
		setCompanyId(null);
		setCustomerName('');
		setEmail('');
		setCustomerNeed('');
		setDeadline('');
	};

	const resetAndClose = () => {
		resetFields();
		setSubmitError('');
		onClose();
	};

	const handleSubmitQuote = async () => {
		if (!canWriteQuotes) return;
		setSubmitError('');
		if (!companyId) {
			setSubmitError('Vincule a empresa para a qual o orçamento será feito.');
			return;
		}
		if (!deadline) {
			setSubmitError('Informe o prazo final de entrega do projeto.');
			return;
		}
		const validItems = items.filter((item) => item.source && item.target);
		if (!validItems.length) {
			setSubmitError(
				'Adicione ao menos um documento com idioma de origem e destino.',
			);
			return;
		}

		setIsSubmitting(true);
		try {
			const created = await createQuoteWithDetail({
				company_id: companyId,
				customer_name: customerName.trim() || undefined,
				email: email.trim() || undefined,
				customer_need: customerNeed.trim() || undefined,
				deadline: dateInputToIso(deadline),
			});
			if (!created.success) {
				setSubmitError(
					created.detail ??
						'Não foi possível criar o orçamento. Tente novamente.',
				);
				return;
			}
			const quote = created.data;

			for (const item of validItems) {
				await createQuoteItem(quote.id, {
					source_language: item.source,
					target_language: item.target,
					document_type: item.docType || undefined,
					file_url: item.fileUrl ?? undefined,
					word_count: item.wordCount ?? undefined,
					estimated_value: item.price ? Number(item.price) : undefined,
				});
			}

			setBannerMessage('Orçamento criado e aguardando decisão.');
			resetFields();
			onCreated();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<Modal
				visible={visible}
				transparent
				animationType="none"
				onRequestClose={resetAndClose}
			>
				<View className="flex-1 items-center justify-center bg-overlay/40 px-4">
					<View className="w-full max-w-[520px] max-h-[85%] rounded-xl bg-surface overflow-hidden">
						<View className="flex-row items-center justify-between border-b border-border-strong px-6 py-4">
							<Text className="font-inter font-bold text-foreground text-lg">
								Novo orçamento
							</Text>
							<TouchableOpacity onPress={resetAndClose}>
								<X size={20} color={themeColors.foregroundSecondary} />
							</TouchableOpacity>
						</View>

						<ScrollView
							className="px-6 py-4"
							contentContainerClassName="gap-4 pb-6"
							keyboardShouldPersistTaps="handled"
						>
							{submitError ? (
								<View className="flex-row items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
									<CircleAlert size={19} color={themeColors.danger} />
									<Text className="flex-1 font-inter text-sm text-danger-text">
										{submitError}
									</Text>
								</View>
							) : null}

							<View className="gap-4" style={{ zIndex: 200 }}>
								<Text className="font-inter-bold text-sm text-foreground">
									Cliente
								</Text>
								<View
									className={isDesktop ? 'flex-row flex-wrap gap-4' : 'gap-4'}
								>
									<View className={isDesktop ? 'w-[48%]' : 'w-full'}>
										<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
											Contato
										</Text>
										<TextInput
											accessibilityLabel="Contato do orçamento"
											className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
											placeholder="Nome de quem recebe o orçamento"
											placeholderTextColor={themeColors.foregroundSubtle}
											value={customerName}
											onChangeText={setCustomerName}
										/>
									</View>
									<View className={isDesktop ? 'w-[48%]' : 'w-full'}>
										<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
											E-mail
										</Text>
										<TextInput
											accessibilityLabel="E-mail do orçamento"
											className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
											placeholder="E-mail para envio"
											placeholderTextColor={themeColors.foregroundSubtle}
											keyboardType="email-address"
											autoCapitalize="none"
											value={email}
											onChangeText={setEmail}
										/>
									</View>
								</View>
								<CompanyLinkField
									label="Empresa"
									companies={companies}
									companyId={companyId}
									onSelectCompany={setCompanyId}
									onRequestCreate={requestCreateCompany}
								/>
							</View>

							<View className="gap-4" style={{ zIndex: 150 }}>
								<Text className="font-inter-bold text-sm text-foreground">
									Projeto
								</Text>
								<View
									className={isDesktop ? 'flex-row flex-wrap gap-4' : 'gap-4'}
								>
									<View className={isDesktop ? 'w-[48%]' : 'w-full'}>
										<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
											Descrição do projeto
										</Text>
										<TextInput
											accessibilityLabel="Descrição do projeto"
											className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
											placeholder="Ex.: Tradução de contrato social"
											placeholderTextColor={themeColors.foregroundSubtle}
											maxLength={100}
											value={customerNeed}
											onChangeText={setCustomerNeed}
										/>
									</View>
									<View
										className={
											isDesktop ? 'w-[48%] flex-row' : 'w-full flex-row'
										}
										style={{ zIndex: 10 }}
									>
										<DateField
											label="Prazo final de entrega"
											value={deadline}
											minDate={todayInputValue()}
											onChangeText={setDeadline}
										/>
									</View>
								</View>
							</View>

							<View>
								<View className="mb-4 flex-row items-center justify-between gap-4">
									<Text className="flex-1 font-inter-bold text-sm text-foreground">
										Documentos do orçamento
									</Text>
									<TouchableOpacity
										accessibilityRole="button"
										onPress={handleAddItem}
										className="shrink-0 items-center rounded-full border border-primary/30 bg-surface px-4 py-2"
									>
										<Text
											numberOfLines={1}
											className="font-inter-medium text-xs text-primary-text"
										>
											+ Adicionar documento
										</Text>
									</TouchableOpacity>
								</View>

								<View className="gap-4">
									{items.map((item, index) => (
										<View
											key={item.id}
											className="relative gap-4 rounded-lg border border-border p-4"
											style={{ zIndex: 100 - index }}
										>
											{items.length > 1 && (
												<Text className="font-inter-medium text-xs text-foreground-muted">
													Documento {index + 1}
												</Text>
											)}
											{items.length > 1 && (
												<TouchableOpacity
													accessibilityRole="button"
													accessibilityLabel="Remover item"
													onPress={() => handleRemoveItem(item.id)}
													className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft"
												>
													<Trash2 size={13} color={themeColors.danger} />
												</TouchableOpacity>
											)}
											<View
												className={
													isDesktop ? 'flex-row flex-wrap gap-4' : 'gap-4'
												}
											>
												<View
													className={isDesktop ? 'w-[48%]' : 'w-full'}
													style={{ zIndex: 50 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Idioma origem
													</Text>
													<LanguageSelect
														value={item.source}
														onChange={(val) =>
															updateItem(item.id, { source: val })
														}
													/>
												</View>
												<View
													className={isDesktop ? 'w-[48%]' : 'w-full'}
													style={{ zIndex: 40 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Idioma destino
													</Text>
													<LanguageSelect
														value={item.target}
														onChange={(val) =>
															updateItem(item.id, { target: val })
														}
													/>
												</View>
												<View
													className={isDesktop ? 'w-[48%]' : 'w-full'}
													style={{ zIndex: 30 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Tipo de documento
													</Text>
													<TextInput
														className="rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
														placeholder="Ex: Contrato Social"
														placeholderTextColor={themeColors.foregroundSubtle}
														value={item.docType}
														onChangeText={(val) =>
															updateItem(item.id, { docType: val })
														}
													/>
												</View>
												<View
													className={isDesktop ? 'w-[48%]' : 'w-full'}
													style={{ zIndex: 20 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Arquivo
													</Text>
													<View className="h-[46px] flex-row gap-2">
														{item.fileUrl && (
															<TouchableOpacity
																accessibilityRole="link"
																accessibilityLabel={`Visualizar arquivo ${item.fileName}`}
																onPress={() => void openDocument(item.fileUrl!)}
																className="min-w-0 flex-1 flex-row items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3"
															>
																<Text
																	className="min-w-0 flex-1 font-inter text-xs text-primary-text"
																	numberOfLines={1}
																	ellipsizeMode="tail"
																>
																	{item.fileName}
																</Text>
															</TouchableOpacity>
														)}
														{!item.fileUrl && (
															<TouchableOpacity
																accessibilityRole="button"
																accessibilityLabel="Anexar arquivo"
																disabled={
																	uploadingItemId === item.id ||
																	!canWriteDocuments
																}
																className={`flex-1 flex-row items-center justify-center gap-2 rounded-md border border-dashed border-border-strong bg-surface p-3 ${!canWriteDocuments ? 'opacity-40' : ''}`}
																onPress={() => void handlePickFile(item.id)}
															>
																<Paperclip
																	size={14}
																	color={themeColors.foregroundMuted}
																/>
																<Text className="font-inter text-xs text-foreground-muted">
																	{uploadingItemId === item.id
																		? 'Enviando...'
																		: 'Anexar arquivo'}
																</Text>
															</TouchableOpacity>
														)}
													</View>
												</View>
												<View
													className={isDesktop ? 'w-[48%]' : 'w-full'}
													style={{ zIndex: 15 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Quantidade de palavras
													</Text>
													<TextInput
														accessibilityLabel="Quantidade de palavras"
														testID="new-quote-item-word-count-input"
														className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter text-sm text-foreground"
														placeholder="Preenchida ao anexar o arquivo"
														placeholderTextColor={themeColors.foregroundSubtle}
														keyboardType="number-pad"
														inputMode="numeric"
														maxLength={WORD_COUNT_MAX_DIGITS}
														value={wordCountInputValue(item.wordCount)}
														onChangeText={(val) =>
															updateItem(item.id, {
																wordCount: parseWordCountInput(val),
															})
														}
													/>
													{item.fileUrl && item.wordCount == null ? (
														<Text className="mt-1 font-inter text-xs text-foreground-muted">
															Não foi possível contar as palavras do arquivo.
															Informe a quantidade manualmente.
														</Text>
													) : null}
												</View>
												<View
													className={isDesktop ? 'w-[32%]' : 'w-full'}
													style={{ zIndex: 10 }}
												>
													<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
														Valor
													</Text>
													<TextInput
														className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter-bold text-sm text-foreground"
														placeholder="R$ 0,00"
														placeholderTextColor={themeColors.foregroundSubtle}
														keyboardType="numeric"
														value={
															item.price ? decimalStringToBRL(item.price) : ''
														}
														onChangeText={(val) =>
															updateItem(item.id, {
																price: maskCurrencyDigits(val),
															})
														}
													/>
												</View>
											</View>
										</View>
									))}
								</View>
								<Text className="mt-4 font-inter text-xs text-foreground-subtle">
									Informe o valor manualmente para cada documento do orçamento.
								</Text>
							</View>
						</ScrollView>

						<View
							className={
								isDesktop
									? 'flex-row items-center justify-between border-t border-border-strong px-6 py-4'
									: 'flex-col gap-4 border-t border-border-strong px-6 py-4'
							}
						>
							<View className={isDesktop ? 'w-auto' : 'w-full'}>
								<Text className="mb-1 font-inter text-xs text-foreground-muted">
									Total do orçamento
								</Text>
								<Text className="font-inter-bold text-2xl text-foreground">
									{decimalStringToBRL(String(total))}
								</Text>
							</View>
							<View
								className={
									isDesktop ? 'flex-row gap-3' : 'w-full flex-col gap-3'
								}
							>
								<TouchableOpacity
									accessibilityRole="button"
									onPress={resetAndClose}
									className={
										isDesktop
											? 'rounded-lg border border-border-strong px-5 py-2.5'
											: 'w-full min-h-[44px] items-center justify-center rounded-lg border border-border-strong px-5 py-2.5'
									}
								>
									<Text className="font-inter font-medium text-foreground text-sm">
										Cancelar
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									accessibilityRole="button"
									disabled={isSubmitting || !canWriteQuotes}
									accessibilityState={{
										disabled: isSubmitting || !canWriteQuotes,
									}}
									onPress={() => void handleSubmitQuote()}
									className={`${isDesktop ? 'rounded-lg px-5 py-2.5' : 'w-full min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5'} ${
										isSubmitting || !canWriteQuotes
											? 'bg-border-strong opacity-60'
											: 'bg-primary'
									}`}
								>
									<Text className="font-inter font-semibold text-primary-foreground text-sm">
										{isSubmitting ? 'Criando…' : 'Criar orçamento'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>

						{bannerMessage && (
							<View
								className="absolute bottom-4 right-4 z-50 flex-row items-center gap-2 rounded-lg border border-success bg-success-soft px-4 py-3 shadow-lg"
								style={{ zIndex: 9999 }}
							>
								<CircleCheck size={18} color={themeColors.success} />
								<Text className="font-inter-medium text-sm text-success-text">
									{bannerMessage}
								</Text>
							</View>
						)}
					</View>
				</View>
			</Modal>
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
		</>
	);
}
