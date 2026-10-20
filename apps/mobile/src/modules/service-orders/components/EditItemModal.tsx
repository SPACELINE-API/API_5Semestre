import {
	useEffect,
	useRef,
	useState,
	type ComponentProps,
	type ComponentType,
} from 'react';
import {
	Modal,
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	Platform,
} from 'react-native';
import { X, Upload, FileText } from 'lucide-react-native';
import type {
	ServiceOrderItem,
	UpdateServiceOrderItemInput,
} from '../types/serviceOrder';
import type { UploadableFile } from '../../../shared/types/file';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { FormField } from '../../clients/components/FormField';
import { LanguageSelect } from '../../quotes/components/LanguageSelect';
import { DateField } from '../../../shared/components/DateField';
import { ToastMessage, type ToastData } from '../../../shared/components/Toast';
import { formatDateInputValue } from '../utils/format';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type EditItemModalProps = {
	item: ServiceOrderItem | null;
	onClose: () => void;
	onSubmit: (
		itemId: string,
		data: UpdateServiceOrderItemInput,
		file: UploadableFile | null,
	) => Promise<void>;
	toast?: ToastData | null;
};

export function EditItemModal({
	item,
	onClose,
	onSubmit,
	toast,
}: EditItemModalProps) {
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const [sourceLanguage, setSourceLanguage] = useState('');
	const [targetLanguage, setTargetLanguage] = useState('');
	const [documentType, setDocumentType] = useState('');
	const [price, setPrice] = useState('');
	const [deadline, setDeadline] = useState('');
	const [file, setFile] = useState<UploadableFile | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!item) return;

		setSourceLanguage(item.source_language);
		setTargetLanguage(item.target_language);
		setDocumentType(item.document_type ?? '');
		setPrice(item.price ?? '');
		setDeadline(formatDateInputValue(item.deadline));
		setFile(null);
		setError(null);
	}, [item]);

	function handleClose() {
		setError(null);
		setFile(null);
		onClose();
	}

	async function handleSubmit() {
		if (!item) return;
		setError(null);

		if (!sourceLanguage.trim() || !targetLanguage.trim()) {
			setError('Informe o idioma de origem e o idioma de destino.');
			return;
		}

		setIsSubmitting(true);

		try {
			await onSubmit(
				item.id,
				{
					source_language: sourceLanguage.trim(),
					target_language: targetLanguage.trim(),
					document_type: documentType.trim() || null,
					price: price.trim() ? Number(price.trim()) : null,
					deadline: deadline ? new Date(deadline).toISOString() : null,
				},
				file,
			);
			handleClose();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível salvar o item.',
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal
			visible={item !== null}
			transparent
			animationType="none"
			onRequestClose={handleClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="w-full max-w-[480px] max-h-[85%] rounded-xl bg-white overflow-hidden">
					<View className="flex-row items-center justify-between border-b border-gray-300 px-6 py-4">
						<Text className="font-inter font-bold text-gray-900 text-lg">
							Editar item
						</Text>
						<TouchableOpacity onPress={handleClose}>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<KeyboardContainer
						className="px-6 py-4"
						contentContainerClassName="gap-4 pb-6"
						{...(Platform.OS === 'web'
							? { keyboardShouldPersistTaps: 'handled' as const }
							: {
									bottomOffset: 20,
									keyboardShouldPersistTaps: 'handled' as const,
								})}
					>
						<View className="flex-col gap-3 md:flex-row">
							<View className="min-w-0 md:flex-1">
								<Text className="mb-1 font-inter font-semibold text-gray-800 text-xs">
									Idioma de origem
								</Text>
								<LanguageSelect
									value={sourceLanguage}
									onChange={setSourceLanguage}
									placeholder="Selecione um idioma"
								/>
							</View>
							<View className="min-w-0 md:flex-1">
								<Text className="mb-1 font-inter font-semibold text-gray-800 text-xs">
									Idioma de destino
								</Text>
								<LanguageSelect
									value={targetLanguage}
									onChange={setTargetLanguage}
									placeholder="Selecione um idioma"
								/>
							</View>
						</View>

						<FormField
							label="Tipo de documento"
							value={documentType}
							onChangeText={setDocumentType}
							placeholder="Ex: Contrato"
						/>

						<FormField
							label="Preço"
							value={price}
							onChangeText={(value) => setPrice(value.replace(/[^0-9.,]/g, ''))}
							placeholder="Ex: 500.00"
						/>

						<DateField
							label="Prazo"
							value={deadline}
							onChangeText={setDeadline}
						/>

						<View className="gap-1.5">
							<Text className="font-inter font-semibold text-gray-800 text-xs">
								Arquivo
							</Text>

							<TouchableOpacity
								onPress={async () => {
									if (Platform.OS === 'web') {
										fileInputRef.current?.click();
										return;
									}
									const picked = await pickDocument();
									if (picked) setFile(picked);
								}}
								activeOpacity={0.7}
								className="flex-row items-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5"
							>
								{file ? (
									<FileText size={16} color="#1C6FB0" />
								) : (
									<Upload size={16} color="#353535" />
								)}
								<Text
									className="flex-1 font-inter text-sm text-gray-700"
									numberOfLines={1}
								>
									{file
										? file.name
										: item?.file_url
											? 'Trocar arquivo (opcional)'
											: 'Selecionar arquivo (opcional)'}
								</Text>
							</TouchableOpacity>

							{Platform.OS === 'web' && (
								<input
									ref={fileInputRef}
									type="file"
									style={{ display: 'none' }}
									onChange={(event: { target: { files: FileList | null } }) => {
										setFile(event.target.files?.[0] ?? null);
									}}
								/>
							)}
						</View>

						{error && (
							<View className="rounded-lg bg-red-50 px-3 py-2.5">
								<Text className="font-inter text-red-900 text-sm">{error}</Text>
							</View>
						)}
					</KeyboardContainer>

					<View className="flex-row items-center justify-end gap-3 border-t border-gray-300 px-6 py-4">
						<TouchableOpacity
							onPress={handleClose}
							className="rounded-lg border border-gray-300 px-5 py-2.5"
						>
							<Text className="font-inter font-medium text-gray-800 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							accessibilityRole="button"
							accessibilityLabel="Confirmar edição do item"
							className={`rounded-lg bg-blue-600 px-5 py-2.5 ${isSubmitting ? 'opacity-60' : ''}`}
						>
							<Text className="font-inter font-semibold text-white text-sm">
								{isSubmitting ? 'Salvando…' : 'Salvar alterações'}
							</Text>
						</TouchableOpacity>
					</View>
				</View>

				{toast && (
					<View pointerEvents="none" className="absolute bottom-6 left-6">
						<ToastMessage toast={toast} />
					</View>
				)}
			</View>
		</Modal>
	);
}
