import { useState } from 'react';
import {
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
import {
	decimalStringToBRL,
	maskCurrencyDigits,
} from '../../../../shared/utils/currency';

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
			animationType="fade"
			onRequestClose={resetAndClose}
		>
			<View className="flex-1 items-center justify-center bg-black/50 p-4">
				<View className="max-h-[90%] w-full max-w-3xl rounded-xl bg-white shadow-lg">
					<View className="flex-row items-center justify-between border-b border-gray-100 px-6 py-4">
						<Text className="font-poppins-bold text-xl text-gray-900">
							Novo orçamento
						</Text>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Fechar"
							onPress={resetAndClose}
							className="h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-50"
						>
							<X size={18} color="#374151" />
						</TouchableOpacity>
					</View>

					<ScrollView contentContainerClassName="p-6 gap-4">
						{submitError ? (
							<View className="flex-row items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
								<CircleAlert size={19} color="#dc2626" />
								<Text className="flex-1 font-inter text-sm text-red-800">
									{submitError}
								</Text>
							</View>
						) : null}

						<View>
							<View className="mb-4 flex-row items-center justify-between">
								<Text className="font-inter-bold text-sm text-gray-900">
									Itens do orçamento
								</Text>
								<TouchableOpacity
									accessibilityRole="button"
									onPress={handleAddItem}
									className="items-center rounded-full border border-blue-200 bg-white px-4 py-2"
								>
									<Text className="font-inter-medium text-xs text-blue-600">
										+ Adicionar item
									</Text>
								</TouchableOpacity>
							</View>

							<View className="gap-4">
								{items.map((item, index) => (
									<View
										key={item.id}
										className="relative gap-4 rounded-lg border border-gray-200 p-4"
										style={{ zIndex: 100 - index }}
									>
										{items.length > 1 && (
											<Text className="font-inter-medium text-xs text-gray-500">
												Item {index + 1}
											</Text>
										)}
										{items.length > 1 && (
											<TouchableOpacity
												accessibilityRole="button"
												accessibilityLabel="Remover item"
												onPress={() => handleRemoveItem(item.id)}
												className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-lg border border-red-100 bg-red-50"
											>
												<Trash2 size={13} color="#b91c1c" />
											</TouchableOpacity>
										)}
										<View className="gap-4 md:flex-row">
											<View className="flex-1" style={{ zIndex: 50 }}>
												<Text className="mb-1.5 font-inter-medium text-xs text-gray-700">
													Idioma origem
												</Text>
												<LanguageSelect
													value={item.source}
													onChange={(val) =>
														updateItem(item.id, { source: val })
													}
												/>
											</View>
											<View className="flex-1" style={{ zIndex: 40 }}>
												<Text className="mb-1.5 font-inter-medium text-xs text-gray-700">
													Idioma destino
												</Text>
												<LanguageSelect
													value={item.target}
													onChange={(val) =>
														updateItem(item.id, { target: val })
													}
												/>
											</View>
											<View className="flex-1" style={{ zIndex: 30 }}>
												<Text className="mb-1.5 font-inter-medium text-xs text-gray-700">
													Tipo de documento
												</Text>
												<TextInput
													className="rounded-md border border-gray-200 bg-white p-3 font-inter text-sm text-gray-800"
													placeholder="Ex: Contrato Social"
													placeholderTextColor="#9CA3AF"
													value={item.docType}
													onChangeText={(val) =>
														updateItem(item.id, { docType: val })
													}
												/>
											</View>
											<View className="flex-1" style={{ zIndex: 20 }}>
												<Text className="mb-1.5 font-inter-medium text-xs text-gray-700">
													Arquivo
												</Text>
												<TouchableOpacity
													accessibilityRole="button"
													disabled={uploadingItemId === item.id}
													className="h-[46px] flex-row items-center justify-center gap-2 rounded-md border border-dashed border-gray-300 bg-white p-3"
													onPress={() => void handlePickFile(item.id)}
												>
													<Paperclip size={14} color="#6b7280" />
													<Text
														className="font-inter text-xs text-gray-500"
														numberOfLines={1}
													>
														{uploadingItemId === item.id
															? 'Enviando...'
															: item.fileName || 'Anexar arquivo'}
													</Text>
												</TouchableOpacity>
											</View>
											<View className="w-full md:w-32" style={{ zIndex: 10 }}>
												<Text className="mb-1.5 font-inter-medium text-xs text-gray-700">
													Valor
												</Text>
												<TextInput
													className="h-[46px] rounded-md border border-gray-200 bg-white p-3 font-inter-bold text-sm text-gray-800"
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
							<Text className="mt-4 font-inter text-xs text-gray-400">
								Informe o valor manualmente para cada item do orçamento.
							</Text>
						</View>

						<View className="flex-col items-center justify-between gap-4 border-t border-gray-100 pt-4 md:flex-row">
							<View className="w-full md:w-auto">
								<Text className="mb-1 font-inter text-xs text-gray-500">
									Total do orçamento
								</Text>
								<Text className="font-poppins-bold text-2xl text-gray-900">
									{decimalStringToBRL(String(total))}
								</Text>
							</View>
							<View className="w-full flex-col gap-3 md:w-auto md:flex-row">
								<TouchableOpacity
									accessibilityRole="button"
									onPress={resetAndClose}
									className="w-full items-center rounded-lg border border-gray-300 px-6 py-2.5 md:w-auto"
								>
									<Text className="font-inter-medium text-sm text-gray-700">
										Cancelar
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									accessibilityRole="button"
									disabled={isSubmitting}
									onPress={() => void handleSubmitQuote()}
									className={`w-full items-center rounded-lg px-6 py-2.5 md:w-auto ${
										isSubmitting
											? 'bg-gray-300'
											: 'bg-blue-600 hover:bg-blue-700'
									}`}
								>
									<Text className="font-inter-medium text-sm text-white">
										{isSubmitting ? 'Criando...' : 'Criar orçamento'}
									</Text>
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>

					{bannerMessage && (
						<View
							className="absolute bottom-4 right-4 z-50 flex-row items-center gap-2 rounded-lg border border-green-600 bg-green-50 px-4 py-3 shadow-lg"
							style={{ zIndex: 9999 }}
						>
							<CircleCheck size={18} color="#16a34a" />
							<Text className="font-inter-medium text-sm text-green-800">
								{bannerMessage}
							</Text>
						</View>
					)}
				</View>
			</View>
		</Modal>
	);
}
