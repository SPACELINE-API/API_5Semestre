import { useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
	CalendarDays,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	FileText,
} from 'lucide-react-native';
import type { ManagedQuote } from '../services/quotesService';
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

function getFileName(fileUrl: string) {
	let filename: string;
	try {
		filename = decodeURIComponent(
			new URL(fileUrl).pathname.split('/').pop() || fileUrl,
		);
	} catch {
		filename = decodeURIComponent(fileUrl.split(/[\\/]/).pop() || fileUrl);
	}

	return filename.replace(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i,
		'',
	);
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

function SectionTitle({ children }: { children: ReactNode }) {
	return (
		<Text className="mb-4 font-inter-semibold text-sm text-gray-900">
			{children}
		</Text>
	);
}

export function QuoteCard({
	quote,
	onDecide,
	onOpenServiceOrder,
	updating,
}: {
	quote: ManagedQuote;
	onDecide: (
		status: 'approved' | 'reproved',
		reason?: string,
	) => Promise<string | null>;
	onOpenServiceOrder: () => void;
	updating: boolean;
}) {
	const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
	const [rejectionFormOpen, setRejectionFormOpen] = useState(false);
	const [reprovalReason, setReprovalReason] = useState('');
	const [decisionError, setDecisionError] = useState('');
	const status = statusStyles[quote.status.toLowerCase()] ?? {
		label: quote.status,
		classes: 'bg-gray-100 text-gray-700',
	};

	return (
		<View className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
			<View className="flex-row flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 md:px-6">
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
					{quote.status === 'approved' && quote.service_order_id ? (
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel={`Abrir ordem de serviço do orçamento ${shortId(quote.id)}`}
							onPress={onOpenServiceOrder}
							className="flex-row items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2"
						>
							<FileText size={16} color="#1d4ed8" />
							<Text className="font-inter-medium text-sm text-blue-700">
								Abrir ordem de serviço
							</Text>
						</TouchableOpacity>
					) : null}
					<View className="flex-row items-center gap-2">
						<CalendarDays size={15} color="#6b7280" />
						<Text className="font-inter text-xs text-gray-500">
							Atualizado {formatDate(quote.updated_at)}
						</Text>
					</View>
				</View>
			</View>

			<View className="gap-6 p-5 md:p-6">
				{quote.status === 'pending' ? (
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
							<View className="mt-4 flex-row flex-wrap gap-3">
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
				<View>
					<SectionTitle>Cliente</SectionTitle>
					<View className="flex-row flex-wrap gap-x-5 gap-y-4">
						<QuoteField label="Contato" value={display(quote.customer_name)} />
						<QuoteField label="Empresa" value={display(quote.enterprise)} />
						<QuoteField label="E-mail" value={display(quote.email)} />
					</View>
				</View>

				<View className="rounded-xl bg-gray-50 p-4">
					<SectionTitle>Solicitação de tradução</SectionTitle>
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
				</View>
				<View>
					<SectionTitle>Documentos ({quote.items.length})</SectionTitle>
					{quote.items.length ? (
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
											{item.estimated_value == null
												? 'Valor não informado'
												: Number(item.estimated_value).toLocaleString('pt-BR', {
														style: 'currency',
														currency: 'BRL',
													})}
										</Text>
									</View>

									<View className="mt-4 border-t border-gray-100 pt-3">
										<Text className="mb-1 font-inter-medium text-xs text-gray-500">
											Arquivo
										</Text>
										{item.file_url ? (
											<TouchableOpacity
												accessibilityRole="link"
												onPress={() => void Linking.openURL(item.file_url!)}
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
				{showTechnicalDetails && (
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
		</View>
	);
}
