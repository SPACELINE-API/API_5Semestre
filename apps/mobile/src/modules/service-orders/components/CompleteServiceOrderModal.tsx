import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Modal,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { FileText, X } from 'lucide-react-native';
import type {
	ServiceOrder,
	ServiceOrderEmailTemplate,
} from '../types/serviceOrder';
import { getServiceOrderEmailTemplate } from '../services/serviceOrderService';

type CompleteServiceOrderModalProps = {
	visible: boolean;
	serviceOrder: ServiceOrder;
	onClose: () => void;
};

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
	onClose,
}: CompleteServiceOrderModalProps) {
	const [template, setTemplate] = useState<ServiceOrderEmailTemplate | null>(
		null,
	);
	const [subject, setSubject] = useState('');
	const [message, setMessage] = useState('');
	const [observation, setObservation] = useState('');
	const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
	const [templateError, setTemplateError] = useState<string | null>(null);

	useEffect(() => {
		if (!visible) return;

		let isCurrent = true;
		setTemplate(null);
		setSubject('');
		setMessage('');
		setObservation('');
		setTemplateError(null);
		setIsLoadingTemplate(true);

		getServiceOrderEmailTemplate()
			.then((data) => {
				if (!isCurrent) return;
				setTemplate(data);
				setSubject(data.subject);
				setMessage(toEditableText(data.body_html));
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
	}, [visible]);

	const deliveryFiles = serviceOrder.files.filter(
		(file) => file.direction === 'saida',
	);

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
								Revise a mensagem e os documentos da entrega
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

					<ScrollView
						className="px-5 py-4 md:px-6"
						contentContainerClassName="gap-5 pb-6"
						keyboardShouldPersistTaps="handled"
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
									{template.available_placeholders.length > 0 && (
										<Text className="font-inter text-gray-400 text-xs">
											Variável disponível:{' '}
											{template.available_placeholders.join(', ')}
										</Text>
									)}
								</View>
							</View>
						)}

						<View className="gap-2">
							<Text className="font-inter font-semibold text-gray-800 text-xs">
								Documentos da entrega
							</Text>
							{deliveryFiles.length === 0 ? (
								<Text className="rounded-lg bg-gray-50 px-3 py-3 font-inter text-gray-400 text-sm">
									Nenhum documento traduzido foi enviado para esta ordem.
								</Text>
							) : (
								deliveryFiles.map((file) => (
									<View
										key={file.id}
										className="flex-row items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
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
												Será anexado ao e-mail
											</Text>
										</View>
									</View>
								))
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
					</ScrollView>

					<View className="flex-row items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 md:px-6">
						<TouchableOpacity
							onPress={onClose}
							activeOpacity={0.7}
							className="rounded-lg border border-gray-200 px-5 py-2.5 hover:bg-gray-50"
						>
							<Text className="font-inter font-medium text-gray-700 text-sm">
								Cancelar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							disabled
							accessibilityRole="button"
							accessibilityState={{ disabled: true }}
							className="rounded-lg bg-blue-600 px-5 py-2.5 opacity-50"
						>
							<Text className="font-inter font-semibold text-white text-sm">
								Enviar
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
