import {
	useEffect,
	useState,
	type ComponentProps,
	type ComponentType,
} from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Check, FileText, Square, X } from 'lucide-react-native';
import type {
	ServiceOrder,
	ServiceOrderEmailTemplate,
} from '../types/serviceOrder';
import {
	getServiceOrderEmailTemplate,
	finalizeAlreadySentServiceOrder,
	sendServiceOrderDeliveries,
} from '../services/serviceOrderService';
import {
	approvedDeliveries,
	canFinalizeOrder,
	currentOutputDeliveries,
} from '../utils/fileReview';
import { openDocument } from '../../../shared/components/FilePreview';

type CompleteServiceOrderModalProps = {
	visible: boolean;
	serviceOrder: ServiceOrder;
	customerName?: string;
	onClose: () => void;
	onSent: () => void;
	onCompleted: () => void;
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function toEmailHtml(text: string, observation: string): string {
	const paragraphs = text
		.trim()
		.split(/\n\s*\n/)
		.filter(Boolean)
		.map(
			(paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
		);
	if (observation.trim()) {
		paragraphs.push(
			`<p><strong>Observação:</strong> ${escapeHtml(observation.trim()).replace(/\n/g, '<br>')}</p>`,
		);
	}
	return paragraphs.join('');
}

function toEditableText(bodyHtml: string): string {
	return bodyHtml
		.replace(/<br\s*\/?\s*>/gi, '\n')
		.replace(/<\/p\s*>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.trim();
}

export function CompleteServiceOrderModal({
	visible,
	serviceOrder,
	customerName,
	onClose,
	onSent,
	onCompleted,
}: CompleteServiceOrderModalProps) {
	const KeyboardContainer = (
		Platform.OS === 'web' ? ScrollView : KeyboardAwareScrollView
	) as ComponentType<ComponentProps<typeof KeyboardAwareScrollView>>;
	const [template, setTemplate] = useState<ServiceOrderEmailTemplate | null>(
		null,
	);
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [observation, setObservation] = useState('');
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	const [templateError, setTemplateError] = useState<string | null>(null);
	const [isSending, setIsSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);
	const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

	const currentFiles = currentOutputDeliveries(serviceOrder.files);
	const deliveryFiles = approvedDeliveries(currentFiles);
	const selectableDeliveryFiles = deliveryFiles.filter(
		(file) => file.delivery_status !== 'sent',
	);
	const allFilesSelected =
		selectableDeliveryFiles.length > 0 &&
		selectableDeliveryFiles.every((file) => selectedFileIds.includes(file.id));

	useEffect(() => {
		if (!visible) return;

		let isCurrent = true;
		setTemplate(null);
		setSubject('');
		setMessage('');
		setObservation('');
		setTemplateError(null);
		setSendError(null);
		setIsSending(false);
		setSelectedFileIds(
			approvedDeliveries(currentOutputDeliveries(serviceOrder.files))
				.filter((file) => file.delivery_status !== 'sent')
				.map((file) => file.id),
		);
		setIsLoadingTemplate(true);

		getServiceOrderEmailTemplate()
			.then((data) => {
				if (!isCurrent) return;
				setTemplate(data);
				setSubject(data.subject);
				setMessage(
					toEditableText(data.body_html).replace(
						/\{\{nome_cliente\}\}/g,
						customerName?.trim() || '{{nome_cliente}}',
					),
				);
			})
			.catch((error: unknown) => {
				if (!isCurrent) return;
				setTemplateError(
					error instanceof Error
						? error.message
						: 'Não foi possível carregar o template do e-mail.',
				);
			})
			.finally(() => {
				if (isCurrent) setIsLoadingTemplate(false);
			});

		return () => {
			isCurrent = false;
		};
	}, [visible, serviceOrder.files, customerName]);

	const canSend =
		!!template &&
		!isLoadingTemplate &&
		!isSending &&
		subject.trim().length > 0 &&
		message.trim().length > 0 &&
		selectedFileIds.length > 0;
	const canFinalize =
		canFinalizeOrder(serviceOrder.items, serviceOrder.files) && !isSending;

	function toggleFile(fileId: string) {
		setSelectedFileIds((current) =>
			current.includes(fileId)
				? current.filter((id) => id !== fileId)
				: [...current, fileId],
		);
	}

	async function handleSend() {
		if (!canSend) return;
		setIsSending(true);
		setSendError(null);
		try {
			await sendServiceOrderDeliveries(serviceOrder.id, {
				file_ids: selectedFileIds,
				subject_override: subject.trim(),
				body_html_override: toEmailHtml(message, observation),
			});
			onSent();
		} catch (error) {
			setSendError(
				error instanceof Error
					? error.message
					: 'Não foi possível enviar os documentos traduzidos.',
			);
		} finally {
			setIsSending(false);
		}
	}

	async function handleFinalize() {
		if (!canFinalize) return;
		setIsSending(true);
		setSendError(null);
		try {
			await finalizeAlreadySentServiceOrder(serviceOrder.id);
			onCompleted();
		} catch (error) {
			setSendError(
				error instanceof Error
					? error.message
					: 'Não foi possível finalizar a ordem de serviço.',
			);
		} finally {
			setIsSending(false);
		}
	}

	async function handleOpenDocument(fileUrl: string) {
		if (!fileUrl) return;
		await openDocument(fileUrl);
	}

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-3 py-4">
				<View className="max-h-[92%] w-full max-w-[640px] overflow-hidden rounded-2xl bg-white shadow-2xl">
					<View className="flex-row items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
						<View className="min-w-0 flex-1">
							<Text className="font-inter font-bold text-gray-900 text-lg">
								Concluir ordem de serviço
							</Text>
							<Text className="mt-0.5 font-inter text-gray-400 text-xs">
								{canFinalize
									? 'Os documentos já foram enviados ao cliente'
									: 'Revise a mensagem e os documentos da entrega'}
							</Text>
						</View>
						<TouchableOpacity
							onPress={onClose}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Fechar conclusão da ordem de serviço"
							className="h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
						>
							<X size={18} color="#6B7280" />
						</TouchableOpacity>
					</View>

					<KeyboardContainer
						className="px-5 py-4 md:px-6"
						contentContainerClassName="gap-5 pb-6"
						{...(Platform.OS === 'web'
							? { keyboardShouldPersistTaps: 'handled' as const }
							: {
									bottomOffset: 20,
									keyboardShouldPersistTaps: 'handled' as const,
								})}
					>
						<View className="gap-1">
							<Text className="font-inter text-gray-500 text-xs">
								Ordem de serviço
							</Text>
							<Text className="font-inter font-semibold text-gray-900 text-sm">
								{serviceOrder.project_name}
							</Text>
						</View>

						{isLoadingTemplate && (
							<View className="flex-row items-center gap-2 rounded-lg bg-gray-50 px-3 py-3">
								<ActivityIndicator size="small" color="#2563EB" />
								<Text className="font-inter text-gray-500 text-sm">
									Carregando template...
								</Text>
							</View>
						)}

						{templateError && (
							<Text
								accessibilityRole="alert"
								className="rounded-lg bg-red-50 px-3 py-2 font-inter text-red-700 text-sm"
							>
								{templateError}
							</Text>
						)}

						{template && (
							<View className="gap-4">
								<View className="gap-1.5">
									<Text className="font-inter font-semibold text-gray-800 text-xs">
										Assunto
									</Text>
									<TextInput
										value={subject}
										onChangeText={setSubject}
										placeholder="Assunto do e-mail"
										placeholderTextColor="#9CA3AF"
										accessibilityLabel="Assunto do e-mail"
										className="rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-gray-900 text-sm outline-none"
									/>
								</View>

								<View className="gap-1.5">
									<Text className="font-inter font-semibold text-gray-800 text-xs">
										Mensagem
									</Text>
									<TextInput
										value={message}
										onChangeText={setMessage}
										placeholder="Mensagem do e-mail"
										placeholderTextColor="#9CA3AF"
										accessibilityLabel="Mensagem do e-mail"
										multiline
										textAlignVertical="top"
										numberOfLines={8}
										className="min-h-[180px] rounded-lg border border-gray-300 px-3 py-3 font-inter text-gray-900 text-sm outline-none"
									/>
								</View>
							</View>
						)}

						<View className="gap-2">
							<View className="flex-row items-center justify-between gap-3">
								<Text className="font-inter font-semibold text-gray-800 text-xs">
									Documentos da entrega
								</Text>
								{selectableDeliveryFiles.length > 0 && (
									<TouchableOpacity
										onPress={() => {
											setSelectedFileIds(
												allFilesSelected
													? []
													: selectableDeliveryFiles.map((file) => file.id),
											);
										}}
										accessibilityRole="checkbox"
										accessibilityState={{ checked: allFilesSelected }}
										className="flex-row items-center gap-1.5"
									>
										{allFilesSelected ? (
											<Check size={16} color="#2563EB" />
										) : (
											<Square size={16} color="#6B7280" />
										)}
										<Text className="font-inter text-blue-600 text-xs">
											Selecionar todos
										</Text>
									</TouchableOpacity>
								)}
							</View>
							{deliveryFiles.length === 0 ? (
								<Text className="rounded-lg bg-gray-50 px-3 py-3 font-inter text-gray-400 text-sm">
									Nenhum documento traduzido foi enviado para esta ordem.
								</Text>
							) : (
								deliveryFiles.map((file) => {
									const isSent = file.delivery_status === 'sent';
									const isSelected = selectedFileIds.includes(file.id);
									return (
										<View
											key={file.id}
											className="flex-row items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5"
										>
											<TouchableOpacity
												onPress={() => !isSent && toggleFile(file.id)}
												disabled={isSent}
												accessibilityRole="checkbox"
												accessibilityState={{
													checked: isSelected,
													disabled: isSent,
												}}
												accessibilityLabel={`Selecionar ${file.filename}`}
												className="p-1"
											>
												{isSelected ? (
													<Check size={18} color="#2563EB" />
												) : (
													<Square
														size={18}
														color={isSent ? '#D1D5DB' : '#6B7280'}
													/>
												)}
											</TouchableOpacity>
											<TouchableOpacity
												onPress={() => handleOpenDocument(file.file_url)}
												activeOpacity={0.7}
												accessibilityRole="link"
												accessibilityLabel={`Abrir documento ${file.filename}`}
												className="min-w-0 flex-1 flex-row items-center gap-3"
											>
												<View className="h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
													<FileText size={17} color="#2563EB" />
												</View>
												<View className="min-w-0 flex-1">
													<Text
														className="font-inter font-medium text-gray-800 text-sm"
														numberOfLines={1}
													>
														{file.filename}
													</Text>
													<Text className="mt-0.5 font-inter text-gray-400 text-xs">
														{isSent
															? 'Já enviado ao cliente'
															: 'Será anexado ao e-mail'}
													</Text>
												</View>
											</TouchableOpacity>
										</View>
									);
								})
							)}
						</View>

						<View className="gap-1.5">
							<Text className="font-inter font-semibold text-gray-800 text-xs">
								Observação (opcional)
							</Text>
							<TextInput
								value={observation}
								onChangeText={setObservation}
								placeholder="Adicione uma observação para incluir no e-mail"
								placeholderTextColor="#9CA3AF"
								accessibilityLabel="Observação opcional para o e-mail"
								multiline
								textAlignVertical="top"
								numberOfLines={3}
								className="min-h-[88px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-gray-900 text-sm outline-none"
							/>
						</View>

						{sendError && (
							<Text
								accessibilityRole="alert"
								className="rounded-lg bg-red-50 px-3 py-2 font-inter text-red-700 text-sm"
							>
								{sendError}
							</Text>
						)}
					</KeyboardContainer>

					<View className="flex-row items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 md:px-6">
						<TouchableOpacity
							onPress={onClose}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel="Cancelar envio dos documentos"
							className="rounded-lg border border-gray-200 px-5 py-2.5 hover:bg-gray-50"
						>
							<Text className="font-inter font-medium text-gray-700 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>
						{canFinalize ? (
							<TouchableOpacity
								onPress={handleFinalize}
								accessibilityRole="button"
								accessibilityState={{ busy: isSending }}
								className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5"
							>
								{isSending && (
									<ActivityIndicator size="small" color="#FFFFFF" />
								)}
								<Text className="font-inter font-semibold text-white text-sm">
									{isSending ? 'Finalizando...' : 'Finalizar OS'}
								</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								onPress={handleSend}
								disabled={!canSend}
								accessibilityRole="button"
								accessibilityState={{ disabled: !canSend, busy: isSending }}
								className={`flex-row items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 ${canSend ? '' : 'opacity-50'}`}
							>
								{isSending && (
									<ActivityIndicator size="small" color="#FFFFFF" />
								)}
								<Text className="font-inter font-semibold text-white text-sm">
									{isSending ? 'Enviando...' : 'Enviar'}
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>
		</Modal>
	);
}
