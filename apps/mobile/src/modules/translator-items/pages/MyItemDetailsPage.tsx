import { useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
	AlertCircle,
	ArrowLeft,
	Download,
	ExternalLink,
	FileText,
	Paperclip,
	Upload,
} from 'lucide-react-native';
import {
	FilePreview,
	openDocument,
} from '../../../shared/components/FilePreview';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import type { NativeFile } from '../../../shared/types/file';
import { pickDocument } from '../../../shared/utils/pickDocument';
import { formatFileSize } from '../../translators/utils/profileFiles';
import { InviteItemProgress } from '../../invites/components/InviteItemProgress';
import { formatDate, formatPrice } from '../../invites/utils/format';
import { useMyItem } from '../hooks/useMyItem';
import {
	DELIVERY_REVIEW_LABELS,
	DELIVERY_REVIEW_STYLES,
	canSendDelivery,
	pendingChangesRequest,
} from '../utils/deliveryReview';
import { deliverMyItem } from '../services/translatorItemService';
import {
	DELIVERY_EXTENSIONS,
	validateDeliveryFile,
} from '../utils/deliveryFiles';

type MyItemDetailsPageProps = {
	id: string;
};

export function MyItemDetailsPage({ id }: MyItemDetailsPageProps) {
	const router = useRouter();
	const { item, setItem, isLoading, error } = useMyItem(id);
	const { toast, showToast } = useToast();
	const [file, setFile] = useState<NativeFile | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);

	async function handlePickFile() {
		setSendError(null);

		const picked = await pickDocument();
		if (!picked) return;

		const validationError = validateDeliveryFile(picked);
		if (validationError) {
			setFile(null);
			setSendError(validationError);
			return;
		}

		setFile(picked);
	}

	async function handleSend() {
		if (!file) {
			setSendError('Selecione o arquivo da tradução.');
			return;
		}

		setIsSending(true);
		setSendError(null);
		try {
			setItem(await deliverMyItem(id, file));
			setFile(null);
			showToast('Tradução enviada com sucesso.', 'success');
		} catch (cause) {
			setSendError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível enviar a tradução. Tente novamente.',
			);
		} finally {
			setIsSending(false);
		}
	}

	const isConcluded = item?.status === 'concluida';
	const changesRequest = item
		? pendingChangesRequest(item.delivered_files)
		: null;
	const canSend = !isConcluded && canSendDelivery(item?.delivered_files ?? []);

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8"
			>
				<TouchableOpacity
					onPress={() => router.push('/meus-itens' as never)}
					activeOpacity={0.7}
					className="mb-6 flex-row items-center gap-2 self-start"
				>
					<ArrowLeft size={16} color="#6B7280" />
					<Text className="font-inter text-gray-500 text-sm">Meus itens</Text>
				</TouchableOpacity>

				{isLoading && (
					<View className="min-h-[300px] items-center justify-center">
						<ActivityIndicator size="large" color="#6B7280" />
					</View>
				)}

				{!isLoading && error && (
					<View className="flex-row items-center gap-2 py-8">
						<AlertCircle size={16} color="#DC2626" />
						<Text className="font-inter font-semibold text-red-600 text-sm">
							{error}
						</Text>
					</View>
				)}

				{!isLoading && !error && item && (
					<View className="gap-6">
						<View className="gap-1 border-b border-gray-200 pb-6">
							<Text className="font-inter font-bold text-gray-950 text-xl">
								{item.source_language} → {item.target_language}
							</Text>
							<Text className="font-inter text-gray-500 text-sm">
								{item.document_type ?? 'Tipo de documento não informado'}
							</Text>
						</View>

						<View className="flex-row flex-wrap gap-x-10 gap-y-4">
							<View className="gap-0.5">
								<Text className="font-inter text-gray-400 text-xs">Prazo</Text>
								<Text className="font-inter font-medium text-gray-800 text-sm">
									{formatDate(item.deadline)}
								</Text>
							</View>
							<View className="gap-0.5">
								<Text className="font-inter text-gray-400 text-xs">Preço</Text>
								<Text className="font-inter font-medium text-gray-800 text-sm">
									{formatPrice(item.price)}
								</Text>
							</View>
							<View className="gap-0.5">
								<Text className="font-inter text-gray-400 text-xs">
									Quantidade de palavras
								</Text>
								<Text className="font-inter font-medium text-gray-800 text-sm">
									{item.word_count ?? 'Não informado'}
								</Text>
							</View>
						</View>

						<InviteItemProgress status={item.status} />

						<View className="gap-2">
							<Text className="font-inter font-semibold text-gray-900 text-sm">
								Documento para traduzir
							</Text>
							{item.file_url ? (
								<>
									<FilePreview fileUrl={item.file_url} openInNewPage />
									<TouchableOpacity
										onPress={() => openDocument(item.file_url as string)}
										activeOpacity={0.7}
										accessibilityRole="link"
										accessibilityLabel="Baixar documento"
										className="flex-row items-center gap-1.5 self-start"
									>
										<Download size={14} color="#1C6FB0" />
										<Text className="font-inter font-medium text-blue-600 text-sm">
											Baixar arquivo
										</Text>
									</TouchableOpacity>
								</>
							) : (
								<Text className="font-inter text-gray-400 text-sm">
									Nenhum documento anexado
								</Text>
							)}
						</View>

						{changesRequest && (
							<View className="gap-1.5 rounded-xl border border-red-100 bg-red-50 p-4">
								<View className="flex-row items-center gap-2">
									<AlertCircle size={16} color="#B91C1C" />
									<Text className="font-inter font-semibold text-red-900 text-sm">
										Ajustes solicitados na sua tradução
									</Text>
								</View>
								<Text className="font-inter text-red-900 text-sm">
									{changesRequest.review_note}
								</Text>
								<Text className="font-inter text-red-800 text-xs">
									Faça os ajustes e envie uma nova versão abaixo.
								</Text>
							</View>
						)}

						<View className="gap-4 rounded-xl border border-gray-100 p-4">
							<View className="gap-1">
								<Text className="font-inter font-semibold text-gray-900 text-sm">
									Enviar tradução
								</Text>
								<Text className="font-inter text-gray-500 text-xs">
									{isConcluded
										? 'Este item já foi concluído e não aceita novos envios.'
										: !canSend
											? 'Sua tradução já foi enviada. Um novo envio só é liberado se forem solicitados ajustes.'
											: `Formatos aceitos: ${DELIVERY_EXTENSIONS.join(', ').toUpperCase()} (até 25 MB).`}
								</Text>
							</View>

							{canSend && (
								<>
									<TouchableOpacity
										onPress={() => void handlePickFile()}
										activeOpacity={0.7}
										accessibilityRole="button"
										className="min-h-11 flex-row items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5"
									>
										<Paperclip size={14} color="#6B7280" />
										<Text
											className="flex-1 font-inter text-gray-600 text-sm"
											numberOfLines={1}
										>
											{file
												? `${file.name}${file.size ? ` (${formatFileSize(file.size)})` : ''}`
												: 'Selecionar arquivo da tradução'}
										</Text>
									</TouchableOpacity>

									{sendError && (
										<View className="rounded-lg bg-red-50 px-3 py-2.5">
											<Text className="font-inter text-red-900 text-sm">
												{sendError}
											</Text>
										</View>
									)}

									<TouchableOpacity
										onPress={() => void handleSend()}
										disabled={isSending}
										activeOpacity={0.7}
										accessibilityRole="button"
										className={`flex-row items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-5 py-2.5 ${isSending ? 'opacity-60' : ''}`}
									>
										{isSending ? (
											<ActivityIndicator size="small" color="#ffffff" />
										) : (
											<Upload size={15} color="#ffffff" />
										)}
										<Text className="font-inter-medium text-sm text-white">
											{isSending ? 'Enviando…' : 'Enviar tradução'}
										</Text>
									</TouchableOpacity>
								</>
							)}
						</View>

						{item.delivered_files.length > 0 && (
							<View className="gap-3">
								<Text className="font-inter font-semibold text-gray-900 text-sm">
									Arquivos enviados
								</Text>
								{item.delivered_files.map((delivered) => (
									<View
										key={delivered.id}
										className="flex-row items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
									>
										<TouchableOpacity
											accessibilityRole="link"
											onPress={() => openDocument(delivered.file_url)}
											className="min-w-0 flex-1 flex-row items-center gap-2"
										>
											<FileText size={16} color="#1C6FB0" />
											<Text
												className="min-w-0 flex-shrink font-inter font-medium text-blue-600 text-sm"
												numberOfLines={1}
											>
												{delivered.filename}
											</Text>
											<ExternalLink size={13} color="#1d4ed8" />
										</TouchableOpacity>
										<View className="items-end gap-1">
											<View
												className={`rounded-full px-2.5 py-0.5 ${DELIVERY_REVIEW_STYLES[delivered.review_status].background}`}
											>
												<Text
													className={`font-inter font-medium text-xs ${DELIVERY_REVIEW_STYLES[delivered.review_status].text}`}
												>
													{DELIVERY_REVIEW_LABELS[delivered.review_status]}
												</Text>
											</View>
											<Text className="font-inter text-gray-400 text-xs">
												{formatDate(delivered.uploaded_at)}
											</Text>
										</View>
									</View>
								))}
							</View>
						)}
					</View>
				)}
			</ScrollView>

			<Toast toast={toast} />
		</View>
	);
}
