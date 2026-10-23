import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, FileText, FileX, Plus } from 'lucide-react-native';
import type { TranslatorCertificate } from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import {
	CERTIFICATE_STATUS_PRESENTATION,
	displayStatusOf,
} from '../utils/certificateStatus';
import { formatFileSize } from '../utils/profileFiles';

type LanguageCertificateCardProps = {
	certificates: TranslatorCertificate[];
	isLoading: boolean;
	error: string | null;
	/** Certificados cujo arquivo não foi encontrado no armazenamento. */
	unavailableIds?: ReadonlySet<string>;
	onRetry: () => void;
	onSelect?: (certificate: TranslatorCertificate) => void;
	onNewCertificate?: () => void;
};

export function LanguageCertificateCard({
	certificates,
	isLoading,
	error,
	unavailableIds,
	onRetry,
	onSelect,
	onNewCertificate,
}: LanguageCertificateCardProps) {
	return (
		<View className="gap-4">
			<View className="flex-row items-center justify-between gap-3">
				<Text className="font-inter font-bold text-gray-900 text-sm">
					Certificados enviados
				</Text>
				<TouchableOpacity
					onPress={onNewCertificate}
					activeOpacity={0.7}
					accessibilityRole="button"
					className="flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5"
				>
					<Plus size={16} color="#ffffff" />
					<Text className="font-inter-medium text-sm text-white">
						Novo certificado
					</Text>
				</TouchableOpacity>
			</View>

			{isLoading && certificates.length === 0 && (
				<View className="items-center py-6">
					<ActivityIndicator color="#6B7280" />
					<Text className="mt-2 font-inter text-gray-400 text-sm">
						Carregando certificados...
					</Text>
				</View>
			)}

			{error && (
				<View className="flex-row items-center justify-between gap-2 rounded-lg bg-red-50 px-3 py-2.5">
					<Text className="flex-1 font-inter text-red-900 text-sm">
						{error}
					</Text>
					<TouchableOpacity onPress={onRetry} accessibilityRole="button">
						<Text className="font-inter font-semibold text-red-900 text-sm">
							Tentar novamente
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{!isLoading && !error && certificates.length === 0 && (
				<View className="items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-8">
					<FileX size={28} color="#9CA3AF" />
					<Text className="text-center font-inter font-semibold text-gray-700 text-sm">
						Nenhum certificado foi anexado.
					</Text>
					<Text className="text-center font-inter text-gray-500 text-xs">
						Envie um certificado para comprovar um novo idioma de trabalho.
					</Text>
				</View>
			)}

			{certificates.map((certificate) => {
				const status = displayStatusOf(
					certificate.status,
					unavailableIds?.has(certificate.id) ?? false,
				);
				const presentation = CERTIFICATE_STATUS_PRESENTATION[status];

				return (
					<TouchableOpacity
						key={certificate.id}
						onPress={onSelect ? () => onSelect(certificate) : undefined}
						disabled={!onSelect}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Certificado de ${certificate.language_name}: ${presentation.label}`}
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
								<View
									className={`rounded-full px-2.5 py-0.5 ${presentation.badge.background}`}
								>
									<Text
										className={`font-inter font-medium text-xs ${presentation.badge.text}`}
									>
										{presentation.label}
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
									{formatFileSize(certificate.size_bytes)}
								</Text>
							</View>
						</View>
						{onSelect && <ChevronRight size={16} color="#9CA3AF" />}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
