import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
	Modal,
	Platform,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {
	CircleAlert,
	ExternalLink,
	FileCheck,
	FileText,
	X,
} from 'lucide-react-native';
import type { ManagedQuote } from '../services/quotesService';
import type { AdditionalService } from '../services/additionalService';
import type { Language } from '../services/languageService';
import { fetchLanguages } from '../services/languageService';
import type {
	QuoteReceipt,
	QuoteReceiptStatus,
	QuoteReceiptVersion,
} from '../services/receiptService';
import {
	getQuoteReceipt,
	getQuoteReceiptDownloadUrl,
	listQuoteReceiptVersions,
} from '../services/receiptService';
import type { Company } from '../../clients/types/company';
import { formatCnpj } from '../../clients/utils/format';
import {
	getNativeDocumentUrl,
	getPreviewDocumentUrl,
} from '../../../shared/components/FilePreview';

const receiptStatusStyles: Record<
	QuoteReceiptStatus,
	{ label: string; badge: string; text: string }
> = {
	available: {
		label: 'Disponível',
		badge: 'bg-blue-50',
		text: 'text-blue-700',
	},
	sent: { label: 'Enviado', badge: 'bg-emerald-50', text: 'text-emerald-700' },
	error: { label: 'Erro', badge: 'bg-red-50', text: 'text-red-700' },
};

function formatDate(value: string | null | undefined) {
	if (!value) return 'Não informado';
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

function formatPrice(value: number | string | null | undefined) {
	return Number(value ?? 0).toLocaleString('pt-BR', {
		style: 'currency',
		currency: 'BRL',
	});
}

function display(value: string | null | undefined) {
	return value?.trim() || 'Não informado';
}

function shortId(value: string) {
	return value.slice(0, 8).toUpperCase();
}

function formatAddress(company: Company) {
	const street = [company.street, company.number].filter(Boolean).join(', ');
	const complement = company.complement ? ` - ${company.complement}` : '';
	const city = [company.city, company.state].filter(Boolean).join('/');
	return [
		`${street}${complement}`,
		[company.neighborhood, city].filter(Boolean).join(' - '),
		company.zip_code ? `CEP ${company.zip_code}` : '',
	]
		.filter(Boolean)
		.join('\n');
}

async function openReceiptPdf(quoteId: string) {
	if (Platform.OS !== 'web') {
		const url = await getQuoteReceiptDownloadUrl(quoteId);
		await WebBrowser.openBrowserAsync(getNativeDocumentUrl(url));
		return;
	}

	const viewer = window.open('about:blank', '_blank');
	if (!viewer) {
		throw new Error(
			'O navegador bloqueou a nova aba. Permita pop-ups para visualizar o PDF.',
		);
	}

	try {
		const url = await getQuoteReceiptDownloadUrl(quoteId);
		const response = await fetch(getPreviewDocumentUrl(url));
		if (!response.ok) {
			throw new Error(
				'Não foi possível abrir o PDF do comprovante. Tente novamente.',
			);
		}
		const blobUrl = URL.createObjectURL(await response.blob());
		viewer.location.href = blobUrl;
		window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
	} catch (error) {
		viewer.close();
		throw error instanceof Error
			? error
			: new Error(
					'Não foi possível abrir o PDF do comprovante. Tente novamente.',
				);
	}
}

function ReceiptStatusBadge({ status }: { status: QuoteReceiptStatus }) {
	const style = receiptStatusStyles[status] ?? receiptStatusStyles.error;
	return (
		<View className={`rounded-full px-2.5 py-1 ${style.badge}`}>
			<Text className={`font-inter-medium text-xs ${style.text}`}>
				{style.label}
			</Text>
		</View>
	);
}

function Notice({
	tone,
	children,
}: {
	tone: 'info' | 'error';
	children: ReactNode;
}) {
	const isError = tone === 'error';
	return (
		<View
			className={`flex-row items-start gap-2 rounded-lg border p-3 ${isError ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
		>
			<CircleAlert size={16} color={isError ? '#b91c1c' : '#6b7280'} />
			<Text
				className={`flex-1 font-inter text-sm ${isError ? 'text-red-800' : 'text-gray-700'}`}
			>
				{children}
			</Text>
		</View>
	);
}

function ReceiptField({ label, value }: { label: string; value: string }) {
	return (
		<View className="w-full gap-1 md:w-[47%]">
			<Text className="font-inter-medium text-xs text-gray-500">{label}</Text>
			<Text selectable className="font-inter text-sm leading-5 text-gray-900">
				{value}
			</Text>
		</View>
	);
}

function ReceiptSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<View className="gap-3 border-t border-gray-100 pt-4">
			<Text className="font-inter-semibold text-sm text-gray-900">{title}</Text>
			{children}
		</View>
	);
}

function TotalRow({
	label,
	value,
	strong,
}: {
	label: string;
	value: string;
	strong?: boolean;
}) {
	return (
		<View className="flex-row items-center justify-between gap-3">
			<Text
				className={`flex-1 text-sm ${strong ? 'font-inter-semibold text-gray-900' : 'font-inter text-gray-600'}`}
			>
				{label}
			</Text>
			<Text
				className={`text-sm ${strong ? 'font-inter-bold text-gray-900' : 'font-inter-medium text-gray-800'}`}
			>
				{value}
			</Text>
		</View>
	);
}

function QuoteReceiptModal({
	visible,
	onClose,
	quote,
	receipt,
	company,
	additionalServices,
}: {
	visible: boolean;
	onClose: () => void;
	quote: ManagedQuote;
	receipt: QuoteReceipt;
	company: Company | undefined;
	additionalServices: AdditionalService[];
}) {
	const [languages, setLanguages] = useState<Language[]>([]);
	const [opening, setOpening] = useState(false);
	const [openError, setOpenError] = useState('');
	const quoteCode = shortId(quote.id);
	const canOpenPdf = receipt.status !== 'error' && Boolean(receipt.pdf_url);

	useEffect(() => {
		if (!visible) return;
		setOpenError('');
		let active = true;
		fetchLanguages().then((data) => {
			if (active) setLanguages(data);
		});
		return () => {
			active = false;
		};
	}, [visible]);

	function languageName(id: string) {
		return languages.find((language) => language.id === id)?.name ?? id;
	}

	async function handleOpenPdf() {
		setOpening(true);
		setOpenError('');
		try {
			await openReceiptPdf(quote.id);
		} catch (error) {
			setOpenError(
				error instanceof Error
					? error.message
					: 'Não foi possível abrir o PDF do comprovante. Tente novamente.',
			);
		} finally {
			setOpening(false);
		}
	}

	const itemsTotal = quote.items.reduce(
		(total, item) => total + Number(item.estimated_value ?? 0),
		0,
	);
	const servicesTotal = additionalServices.reduce(
		(total, service) => total + Number(service.price ?? 0),
		0,
	);

	return (
		<Modal
			visible={visible}
			transparent
			animationType="none"
			onRequestClose={onClose}
		>
			<View className="flex-1 items-center justify-center bg-black/40 px-4">
				<View className="max-h-[90%] w-full max-w-[640px] overflow-hidden rounded-xl bg-white">
					<View className="flex-row items-center justify-between gap-3 border-b border-gray-300 px-5 py-4 md:px-6">
						<View className="min-w-0 flex-1 gap-0.5">
							<Text className="font-inter font-bold text-lg text-gray-900">
								Comprovante comercial
							</Text>
							<Text className="font-inter text-xs text-gray-500">
								Orçamento #{quoteCode}
							</Text>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Fechar comprovante"
							onPress={onClose}
						>
							<X size={20} color="#5A5A5A" />
						</TouchableOpacity>
					</View>

					<ScrollView
						className="px-5 py-4 md:px-6"
						contentContainerClassName="gap-4 pb-6"
					>
						<View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
							<ReceiptStatusBadge status={receipt.status} />
							<Text className="font-inter text-xs text-gray-500">
								Gerado em {formatDate(receipt.generated_at)}
							</Text>
							{receipt.sent_at ? (
								<Text className="font-inter text-xs text-gray-500">
									Enviado em {formatDate(receipt.sent_at)}
								</Text>
							) : null}
						</View>

						{receipt.status === 'error' ? (
							<Notice tone="error">
								Houve um erro na geração do comprovante. O PDF não está
								disponível para visualização.
							</Notice>
						) : null}

						<TouchableOpacity
							accessibilityRole="link"
							accessibilityLabel={`Abrir PDF do comprovante ${quoteCode} em nova aba`}
							disabled={!canOpenPdf || opening}
							onPress={() => void handleOpenPdf()}
							className={`flex-row items-center gap-3 rounded-xl border border-gray-200 p-4 ${canOpenPdf ? 'hover:bg-gray-50' : 'opacity-50'}`}
						>
							<View className="h-10 w-10 items-center justify-center rounded-lg bg-red-50">
								<FileText size={20} color="#d71920" />
							</View>
							<View className="min-w-0 flex-1">
								<Text
									className="font-inter-semibold text-sm text-gray-900"
									numberOfLines={1}
								>
									Comprovante_{quoteCode}.pdf
								</Text>
								<Text className="mt-0.5 font-inter text-xs text-gray-500">
									{opening
										? 'Abrindo PDF...'
										: canOpenPdf
											? 'Clique para abrir o PDF em uma nova aba'
											: 'PDF indisponível'}
								</Text>
							</View>
							{canOpenPdf ? <ExternalLink size={16} color="#1d4ed8" /> : null}
						</TouchableOpacity>

						{openError ? <Notice tone="error">{openError}</Notice> : null}

						<ReceiptSection title="Cliente">
							<View className="flex-row flex-wrap gap-x-5 gap-y-3">
								<ReceiptField
									label="Contato"
									value={display(quote.customer_name)}
								/>
								<ReceiptField label="E-mail" value={display(quote.email)} />
							</View>
						</ReceiptSection>

						<ReceiptSection title="Empresa">
							<View className="flex-row flex-wrap gap-x-5 gap-y-3">
								<ReceiptField
									label="Empresa"
									value={display(
										company?.legal_name ||
											quote.company_name ||
											quote.enterprise,
									)}
								/>
								<ReceiptField
									label="CNPJ"
									value={
										company?.cnpj ? formatCnpj(company.cnpj) : 'Não informado'
									}
								/>
								<ReceiptField
									label="Endereço"
									value={company ? formatAddress(company) : 'Não informado'}
								/>
							</View>
						</ReceiptSection>

						<ReceiptSection title="Serviço">
							<View className="flex-row flex-wrap gap-x-5 gap-y-3">
								<ReceiptField
									label="Descrição"
									value={display(quote.customer_need)}
								/>
								<ReceiptField
									label="Data de aprovação"
									value={formatDate(quote.approved_at)}
								/>
							</View>
						</ReceiptSection>

						<ReceiptSection title={`Itens (${quote.items.length})`}>
							{quote.items.length ? (
								quote.items.map((item) => (
									<View
										key={item.id}
										className="gap-2 rounded-lg border border-gray-200 p-3"
									>
										<View className="flex-row items-start justify-between gap-3">
											<Text className="flex-1 font-inter-semibold text-sm text-gray-900">
												{display(item.document_type)}
											</Text>
											<Text className="font-inter-semibold text-sm text-gray-900">
												{formatPrice(item.estimated_value)}
											</Text>
										</View>
										<View className="flex-row flex-wrap gap-x-5 gap-y-1">
											<Text className="font-inter text-xs text-gray-600">
												Origem:{' '}
												<Text className="font-inter-medium text-gray-900">
													{languageName(item.source_language)}
												</Text>
											</Text>
											<Text className="font-inter text-xs text-gray-600">
												Destino:{' '}
												<Text className="font-inter-medium text-gray-900">
													{languageName(item.target_language)}
												</Text>
											</Text>
										</View>
									</View>
								))
							) : (
								<Text className="font-inter text-sm text-gray-500">
									Nenhum item registrado.
								</Text>
							)}
						</ReceiptSection>

						<ReceiptSection
							title={`Serviços adicionais (${additionalServices.length})`}
						>
							{additionalServices.length ? (
								additionalServices.map((service) => (
									<View
										key={service.id}
										className="flex-row items-start justify-between gap-3 rounded-lg border border-gray-200 p-3"
									>
										<Text className="flex-1 font-inter text-sm text-gray-900">
											{service.description}
										</Text>
										<Text className="font-inter-semibold text-sm text-gray-900">
											{formatPrice(service.price)}
										</Text>
									</View>
								))
							) : (
								<Text className="font-inter text-sm text-gray-500">
									Nenhum serviço adicional.
								</Text>
							)}
						</ReceiptSection>

						<ReceiptSection title="Valores">
							<View className="gap-2 rounded-lg bg-gray-50 p-3">
								<TotalRow
									label={`Subtotal de itens (${quote.items.length})`}
									value={formatPrice(itemsTotal)}
								/>
								<TotalRow
									label={`Subtotal de serviços adicionais (${additionalServices.length})`}
									value={formatPrice(servicesTotal)}
								/>
								<View className="border-t border-gray-200 pt-2">
									<TotalRow
										label="Valor total"
										value={formatPrice(itemsTotal + servicesTotal)}
										strong
									/>
								</View>
							</View>
						</ReceiptSection>
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

export function QuoteReceiptSection({
	quote,
	company,
	additionalServices,
}: {
	quote: ManagedQuote;
	company: Company | undefined;
	additionalServices: AdditionalService[];
}) {
	const [receipt, setReceipt] = useState<QuoteReceipt | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [modalOpen, setModalOpen] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const [versions, setVersions] = useState<QuoteReceiptVersion[]>([]);

	useEffect(() => {
		let active = true;
		listQuoteReceiptVersions(quote.id)
			.then((data) => {
				if (active) setVersions(data);
			})
			.catch(() => {
				if (active) setVersions([]);
			});
		return () => {
			active = false;
		};
	}, [quote.id, quote.approved_at, reloadKey]);

	async function openVersion(url: string) {
		if (Platform.OS === 'web') {
			window.open(getPreviewDocumentUrl(url), '_blank', 'noopener,noreferrer');
			return;
		}
		await WebBrowser.openBrowserAsync(getNativeDocumentUrl(url));
	}

	useEffect(() => {
		let active = true;
		setLoading(true);
		setError('');
		getQuoteReceipt(quote.id)
			.then((result) => {
				if (active) setReceipt(result.found ? result.receipt : null);
			})
			.catch((loadError: Error) => {
				if (active) setError(loadError.message);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [quote.id, quote.approved_at, reloadKey]);

	return (
		<View className="gap-3 rounded-xl border border-gray-200 p-4">
			<View className="flex-row flex-wrap items-center justify-between gap-3">
				<View className="flex-row items-center gap-3">
					<View className="h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
						<FileCheck size={18} color="#047857" />
					</View>
					<View className="gap-1">
						<Text className="font-inter-semibold text-sm text-gray-900">
							Comprovante comercial
						</Text>
						{receipt ? (
							<Text className="font-inter text-xs text-gray-500">
								Gerado em {formatDate(receipt.generated_at)}
							</Text>
						) : null}
					</View>
				</View>
				{receipt ? <ReceiptStatusBadge status={receipt.status} /> : null}
			</View>

			{loading ? (
				<Text className="font-inter text-sm text-gray-500">
					Carregando comprovante...
				</Text>
			) : error ? (
				<View className="gap-2">
					<Notice tone="error">{error}</Notice>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={() => setReloadKey((key) => key + 1)}
						className="self-start"
					>
						<Text className="font-inter-medium text-sm text-blue-700">
							Tentar novamente
						</Text>
					</TouchableOpacity>
				</View>
			) : !receipt ? (
				<Notice tone="info">
					O comprovante comercial ainda não está disponível para este orçamento.
				</Notice>
			) : (
				<>
					{receipt.status === 'error' ? (
						<Notice tone="error">
							Houve um erro na geração do comprovante. O documento não está
							disponível.
						</Notice>
					) : null}
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel={`Ver comprovante do orçamento ${shortId(quote.id)}`}
						onPress={() => setModalOpen(true)}
						className="flex-row items-center justify-center gap-2 self-start rounded-lg border border-blue-200 px-3 py-2"
					>
						<FileText size={16} color="#1d4ed8" />
						<Text className="font-inter-medium text-sm text-blue-700">
							Ver comprovante
						</Text>
					</TouchableOpacity>
					<QuoteReceiptModal
						visible={modalOpen}
						onClose={() => setModalOpen(false)}
						quote={quote}
						receipt={receipt}
						company={company}
						additionalServices={additionalServices}
					/>
				</>
			)}

			{versions.length > 1 ? (
				<View className="gap-2 border-t border-gray-100 pt-3">
					<Text className="font-inter-medium text-xs text-gray-500">
						Versões do comprovante
					</Text>
					{versions.map((version, index) => (
						<View
							key={version.id}
							className="flex-row flex-wrap items-center justify-between gap-2"
						>
							<Text className="font-inter text-sm text-gray-800">
								Versão {version.version}
								{index === 0 ? ' (atual)' : ''} · gerada em{' '}
								{formatDate(version.generated_at)}
							</Text>
							<View className="flex-row items-center gap-3">
								<ReceiptStatusBadge status={version.status} />
								{version.pdf_url ? (
									<TouchableOpacity
										accessibilityRole="link"
										accessibilityLabel={`Abrir comprovante versão ${version.version}`}
										onPress={() => void openVersion(version.pdf_url!)}
										className="flex-row items-center gap-1"
									>
										<ExternalLink size={14} color="#1d4ed8" />
										<Text className="font-inter-medium text-sm text-blue-700">
											PDF
										</Text>
									</TouchableOpacity>
								) : null}
							</View>
						</View>
					))}
				</View>
			) : null}
		</View>
	);
}
