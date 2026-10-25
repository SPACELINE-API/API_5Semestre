import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import {
	CheckCircle2,
	ChevronRight,
	Clock,
	FileText,
	Inbox,
	XCircle,
} from 'lucide-react-native';
import {
	CERTIFICATE_STATUS_LABELS,
	type CertificateStatus,
	type TranslatorCertificate,
} from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import { formatFileSize } from '../utils/profileFiles';

type StatusFilter = 'all' | CertificateStatus;

const STATUS_STYLES: Record<
	CertificateStatus,
	{ bar: string; badgeBg: string; badgeText: string; icon: string }
> = {
	pending: {
		bar: 'bg-amber-400',
		badgeBg: 'bg-amber-50',
		badgeText: 'text-amber-800',
		icon: '#B45309',
	},
	approved: {
		bar: 'bg-green-500',
		badgeBg: 'bg-green-50',
		badgeText: 'text-green-800',
		icon: '#15803D',
	},
	rejected: {
		bar: 'bg-red-500',
		badgeBg: 'bg-red-50',
		badgeText: 'text-red-800',
		icon: '#B91C1C',
	},
};

const STATUS_ICONS = {
	pending: Clock,
	approved: CheckCircle2,
	rejected: XCircle,
};

const FILTERS: { key: StatusFilter; label: string }[] = [
	{ key: 'all', label: 'Todos' },
	{ key: 'pending', label: 'Pendentes' },
	{ key: 'approved', label: 'Aprovados' },
	{ key: 'rejected', label: 'Recusados' },
];

const EMPTY_MESSAGES: Record<StatusFilter, string> = {
	all: 'Nenhuma solicitação de certificado.',
	pending: 'Nenhum certificado aguardando avaliação.',
	approved: 'Nenhum certificado aprovado.',
	rejected: 'Nenhum certificado recusado.',
};

type CertificateRequestsListProps = {
	certificates: TranslatorCertificate[];
	isLoading: boolean;
	error: string | null;
	onRetry: () => void;
	onSelect: (certificate: TranslatorCertificate) => void;
};

function formatDate(value: string) {
	return new Date(value).toLocaleDateString('pt-BR');
}

function languageCode(languageId: string) {
	return languageId.split('-')[0].toUpperCase();
}

export function CertificateRequestsList({
	certificates,
	isLoading,
	error,
	onRetry,
	onSelect,
}: CertificateRequestsListProps) {
	const [filter, setFilter] = useState<StatusFilter>('all');

	const counts = useMemo(
		() => ({
			all: certificates.length,
			pending: certificates.filter((item) => item.status === 'pending').length,
			approved: certificates.filter((item) => item.status === 'approved')
				.length,
			rejected: certificates.filter((item) => item.status === 'rejected')
				.length,
		}),
		[certificates],
	);

	const visible = useMemo(
		() =>
			[...certificates]
				.filter((item) => filter === 'all' || item.status === filter)
				.sort(
					(a, b) =>
						Number(b.status === 'pending') - Number(a.status === 'pending') ||
						b.updated_at.localeCompare(a.updated_at),
				),
		[certificates, filter],
	);

	if (isLoading && certificates.length === 0) {
		return (
			<View className="items-center py-10">
				<ActivityIndicator color="#6B7280" />
				<Text className="mt-2 font-inter text-gray-400 text-sm">
					Carregando solicitações...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-row items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2.5">
				<Text className="flex-1 font-inter text-red-900 text-sm">{error}</Text>
				<TouchableOpacity onPress={onRetry} accessibilityRole="button">
					<Text className="font-inter font-semibold text-red-900 text-sm">
						Tentar novamente
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (certificates.length === 0) {
		return (
			<View className="items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-10">
				<Inbox size={28} color="#9CA3AF" />
				<Text className="text-center font-inter font-semibold text-gray-700 text-sm">
					Nenhuma solicitação de certificado.
				</Text>
				<Text className="text-center font-inter text-gray-500 text-xs">
					Os certificados enviados pelo tradutor aparecerão aqui.
				</Text>
			</View>
		);
	}

	return (
		<View className="gap-4">
			{counts.pending > 0 && (
				<View className="flex-row items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
					<Clock size={18} color="#B45309" />
					<View className="flex-1">
						<Text className="font-inter font-semibold text-amber-900 text-sm">
							{counts.pending === 1
								? '1 certificado aguarda a sua avaliação'
								: `${counts.pending} certificados aguardam a sua avaliação`}
						</Text>
						<Text className="font-inter text-amber-800 text-xs">
							Ao aprovar, o idioma entra automaticamente no perfil do tradutor.
						</Text>
					</View>
				</View>
			)}

			<View className="flex-row flex-wrap gap-2">
				{FILTERS.map((item) => {
					const isActive = item.key === filter;
					return (
						<TouchableOpacity
							key={item.key}
							onPress={() => setFilter(item.key)}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityState={{ selected: isActive }}
							accessibilityLabel={`Filtrar por ${item.label}`}
							className={`flex-row items-center gap-2 rounded-full border px-3.5 py-1.5 ${
								isActive
									? 'border-blue-600 bg-blue-600'
									: 'border-gray-200 bg-white'
							}`}
						>
							<Text
								className={`font-inter font-medium text-xs ${
									isActive ? 'text-white' : 'text-gray-700'
								}`}
							>
								{item.label}
							</Text>
							<View
								className={`min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
									isActive ? 'bg-white/20' : 'bg-gray-100'
								}`}
							>
								<Text
									className={`font-inter font-semibold text-[11px] ${
										isActive ? 'text-white' : 'text-gray-600'
									}`}
								>
									{counts[item.key]}
								</Text>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>

			{visible.length === 0 && (
				<View className="items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-8">
					<Inbox size={24} color="#9CA3AF" />
					<Text className="text-center font-inter text-gray-500 text-sm">
						{EMPTY_MESSAGES[filter]}
					</Text>
				</View>
			)}

			{visible.map((certificate) => {
				const style = STATUS_STYLES[certificate.status];
				const StatusIcon = STATUS_ICONS[certificate.status];
				const isPending = certificate.status === 'pending';

				return (
					<TouchableOpacity
						key={certificate.id}
						onPress={() => onSelect(certificate)}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Solicitação de ${certificate.language_name}: ${CERTIFICATE_STATUS_LABELS[certificate.status]}`}
						className="flex-row items-stretch gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-4"
					>
						<View className={`w-1 rounded-full ${style.bar}`} />

						<View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
							<Text className="font-inter font-bold text-blue-700 text-sm">
								{languageCode(certificate.language_id)}
							</Text>
						</View>

						<View className="min-w-0 flex-1 gap-1.5">
							<View className="flex-row flex-wrap items-center gap-2">
								<Text
									className="font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={1}
								>
									{certificate.language_name}
								</Text>
								<View className="rounded-full bg-gray-100 px-2 py-0.5">
									<Text className="font-inter font-medium text-gray-700 text-xs">
										{PROFICIENCY_LABELS[certificate.proficiency_level]}
									</Text>
								</View>
								<View
									className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 ${style.badgeBg}`}
								>
									<StatusIcon size={12} color={style.icon} />
									<Text
										className={`font-inter font-medium text-xs ${style.badgeText}`}
									>
										{CERTIFICATE_STATUS_LABELS[certificate.status]}
									</Text>
								</View>
							</View>

							<View className="flex-row items-center gap-1.5">
								<FileText size={13} color="#6B7280" />
								<Text
									className="min-w-0 flex-1 font-inter text-gray-500 text-xs"
									numberOfLines={1}
								>
									{certificate.filename} ·{' '}
									{formatFileSize(certificate.size_bytes)}
								</Text>
							</View>

							<Text className="font-inter text-gray-400 text-xs">
								{certificate.reviewed_at
									? `Avaliado em ${formatDate(certificate.reviewed_at)}`
									: `Enviado em ${formatDate(certificate.updated_at)}`}
							</Text>

							{certificate.status === 'rejected' && certificate.review_note && (
								<View className="rounded-lg bg-red-50 px-3 py-2">
									<Text
										className="font-inter text-red-900 text-xs"
										numberOfLines={2}
									>
										Motivo: {certificate.review_note}
									</Text>
								</View>
							)}
						</View>

						{isPending ? (
							<View className="self-center rounded-lg bg-blue-600 px-3.5 py-2">
								<Text className="font-inter font-semibold text-white text-xs">
									Avaliar
								</Text>
							</View>
						) : (
							<View className="self-center">
								<ChevronRight size={16} color="#9CA3AF" />
							</View>
						)}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
