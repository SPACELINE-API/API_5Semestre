import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, FileText, FileX, Plus } from 'lucide-react-native';
import type { TranslatorCertificate } from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import {
	CERTIFICATE_STATUS_PRESENTATION,
	displayStatusOf,
} from '../utils/certificateStatus';
import { formatFileSize } from '../utils/profileFiles';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
	const themeColors = useThemeColors();
	return (
		<View className="gap-4">
			<View className="flex-row items-center justify-between gap-3">
				<Text className="font-inter font-bold text-foreground text-sm">
					Certificados enviados
				</Text>
				<TouchableOpacity
					onPress={onNewCertificate}
					activeOpacity={0.7}
					accessibilityRole="button"
					className="flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2.5"
				>
					<Plus size={16} color={themeColors.primaryForeground} />
					<Text className="font-inter-medium text-sm text-primary-foreground">
						Novo certificado
					</Text>
				</TouchableOpacity>
			</View>

			{isLoading && certificates.length === 0 && (
				<View className="items-center py-6">
					<ActivityIndicator color={themeColors.foregroundMuted} />
					<Text className="mt-2 font-inter text-foreground-subtle text-sm">
						Carregando certificados...
					</Text>
				</View>
			)}

			{error && (
				<View className="flex-row items-center justify-between gap-2 rounded-lg bg-danger-soft px-3 py-2.5">
					<Text className="flex-1 font-inter text-danger-text text-sm">
						{error}
					</Text>
					<TouchableOpacity onPress={onRetry} accessibilityRole="button">
						<Text className="font-inter font-semibold text-danger-text text-sm">
							Tentar novamente
						</Text>
					</TouchableOpacity>
				</View>
			)}

			{!isLoading && !error && certificates.length === 0 && (
				<View className="items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-8">
					<FileX size={28} color={themeColors.foregroundSubtle} />
					<Text className="text-center font-inter font-semibold text-foreground-secondary text-sm">
						Nenhum certificado foi anexado.
					</Text>
					<Text className="text-center font-inter text-foreground-muted text-xs">
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
						className="flex-row items-center gap-3 rounded-lg border border-border p-3"
					>
						<View className="flex-1 gap-2">
							<View className="flex-row items-center justify-between gap-2">
								<Text
									className="flex-1 font-inter font-semibold text-foreground text-sm"
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
								<FileText size={14} color={themeColors.foregroundMuted} />
								<Text
									className="flex-1 font-inter text-foreground-muted text-xs"
									numberOfLines={1}
								>
									{certificate.filename} ·{' '}
									{formatFileSize(certificate.size_bytes)}
								</Text>
							</View>
						</View>
						{onSelect && (
							<ChevronRight size={16} color={themeColors.foregroundSubtle} />
						)}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
