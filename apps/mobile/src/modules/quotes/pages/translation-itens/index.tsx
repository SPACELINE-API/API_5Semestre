import { useState } from 'react';
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
	createQuote,
	createQuoteItem,
	uploadQuoteDocument,
} from '../../services/quotesService';
import { pickDocument } from '../../../../shared/utils/pickDocument';
import { openDocument } from '../../../../shared/components/FilePreview';
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../../shared/utils/currency';
import { usePermission } from '../../../auth/hooks/usePermission';

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
	const [items, setItems] = useState<QuoteItem[]>([createEmptyItem()]);
	const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const canWriteDocuments = usePermission('documents.write');
	const [bannerMessage, setBannerMessage] = useState<string | null>(null);

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
		const file = await pickDocument();
		if (!file) return;

		setUploadingItemId(itemId);
		try {
			const fileUrl = await uploadQuoteDocument(file.uri, file.name);
			if (fileUrl) {
				updateItem(itemId, { fileName: file.name, fileUrl });
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

	const resetAndClose = () => {
		setItems([createEmptyItem()]);
		setSubmitError('');
		onClose();
	};

	const handleSubmitQuote = async () => {
		setSubmitError('');
		const validItems = items.filter((item) => item.source && item.target);
		if (!validItems.length) {
			setSubmitError(
				'Adicione ao menos um item com idioma de origem e destino.',
			);
			return;
		}

		setIsSubmitting(true);
		try {
			const quote = await createQuote();
			if (!quote) {
				setSubmitError('Não foi possível criar o orçamento. Tente novamente.');
				return;
			}

			for (const item of validItems) {
				await createQuoteItem(quote.id, {
					source_language: item.source,
					target_language: item.target,
					document_type: item.docType || undefined,
					file_url: item.fileUrl ?? undefined,
					estimated_value: item.price ? Number(item.price) : undefined,
				});
			}

			setBannerMessage('Orçamento criado e aguardando decisão.');
			setItems([createEmptyItem()]);
			onCreated();
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
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
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						keyboardShouldPersistTaps="handled"
					>
						{submitError ? (
							<View className="flex-row items-start gap-3 rounded-lg border border-danger/30 bg-danger-soft p-4">
								<CircleAlert size={19} color="#dc2626" />
								<Text className="flex-1 font-inter text-sm text-danger-text">
									{submitError}
								</Text>
							</View>
						) : null}

						<View>
							<View className="mb-4 flex-row items-center justify-between">
								<Text className="font-inter-bold text-sm text-foreground">
									Itens do orçamento
								</Text>
								<TouchableOpacity
									accessibilityRole="button"
									onPress={handleAddItem}
									className="items-center rounded-full border border-primary/30 bg-surface px-4 py-2"
								>
									<Text className="font-inter-medium text-xs text-primary-text">
										+ Adicionar item
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
												Item {index + 1}
											</Text>
										)}
										{items.length > 1 && (
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel="Remover item"
												onPress={() => handleRemoveItem(item.id)}
												className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft"
											>
												<Trash2 size={13} color="#b91c1c" />
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
													placeholderTextColor="#9CA3AF"
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
															<Paperclip size={14} color="#6b7280" />
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
												className={isDesktop ? 'w-[32%]' : 'w-full'}
												style={{ zIndex: 10 }}
											>
												<Text className="mb-1.5 font-inter-medium text-xs text-foreground-secondary">
													Valor
												</Text>
												<TextInput
													className="h-[46px] rounded-md border border-border bg-surface p-3 font-inter-bold text-sm text-foreground"
													placeholder="R$ 0,00"
													placeholderTextColor="#9CA3AF"
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
								Informe o valor manualmente para cada item do orçamento.
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
							className={isDesktop ? 'flex-row gap-3' : 'w-full flex-col gap-3'}
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
								disabled={isSubmitting}
								onPress={() => void handleSubmitQuote()}
								className={`${isDesktop ? 'rounded-lg px-5 py-2.5' : 'w-full min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5'} ${
									isSubmitting ? 'bg-border-strong opacity-60' : 'bg-primary'
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
							<CircleCheck size={18} color="#16a34a" />
							<Text className="font-inter-medium text-sm text-success-text">
								{bannerMessage}
							</Text>
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}
