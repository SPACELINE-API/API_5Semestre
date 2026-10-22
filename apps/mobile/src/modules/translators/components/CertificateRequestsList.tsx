import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, FileText, Inbox } from 'lucide-react-native';
import {
	CERTIFICATE_STATUS_LABELS,
	type CertificateStatus,
	type TranslatorCertificate,
} from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import { formatFileSize } from '../utils/profileFiles';

const BADGE_STYLES: Record<CertificateStatus, { bg: string; text: string }> = {
	pending: { bg: 'bg-amber-50', text: 'text-amber-800' },
	approved: { bg: 'bg-green-50', text: 'text-green-800' },
	rejected: { bg: 'bg-red-50', text: 'text-red-800' },
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

// SOLICITACOES DE CERTIFICADO DO TRADUTOR (VISAO DO ADMINISTRADOR): PENDENTES PRIMEIRO
export function CertificateRequestsList({
	certificates,
	isLoading,
	error,
	onRetry,
	onSelect,
}: CertificateRequestsListProps) {
	const ordered = [...certificates].sort(
		(a, b) => Number(b.status === 'pending') - Number(a.status === 'pending'),
	);

	if (isLoading && certificates.length === 0) {
		return (
			<View className="items-center py-6">
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
			<View className="items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-8">
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
		<View className="gap-3">
			{ordered.map((certificate) => {
				const badge = BADGE_STYLES[certificate.status];
				return (
					<TouchableOpacity
						key={certificate.id}
						onPress={() => onSelect(certificate)}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Solicitação de ${certificate.language_name}: ${CERTIFICATE_STATUS_LABELS[certificate.status]}`}
						className="flex-row items-center gap-3 rounded-lg border border-gray-200 p-3"
					>
						<View className="flex-1 gap-2">
							<View className="flex-row items-center justify-between gap-2">
								<Text
									className="flex-1 font-inter font-semibold text-gray-900 text-sm"
									numberOfLines={1}
								>
									{certificate.language_name} ·{' '}
									{PROFICIENCY_LABELS[certificate.proficiency_level]}
								</Text>
								<View className={`rounded-full px-2.5 py-0.5 ${badge.bg}`}>
									<Text
										className={`font-inter font-medium text-xs ${badge.text}`}
									>
										{CERTIFICATE_STATUS_LABELS[certificate.status]}
									</Text>
								</View>
							</View>
							<View className="flex-row items-center gap-2">
								<FileText size={14} color="#6B7280" />
								<Text
									className="flex-1 font-inter text-gray-500 text-xs"
									numberOfLines={1}
								>
									{certificate.filename} ·{' '}
									{formatFileSize(certificate.size_bytes)} · enviado em{' '}
									{formatDate(certificate.updated_at)}
								</Text>
							</View>
						</View>
						<ChevronRight size={16} color="#9CA3AF" />
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
