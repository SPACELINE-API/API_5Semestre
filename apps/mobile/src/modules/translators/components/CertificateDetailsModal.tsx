import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Eye, FileText, RefreshCw } from 'lucide-react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { openDocument } from '../../../shared/components/FilePreview';
import { ApiError } from '../../../shared/services/publicApiClient';
import { getMyCertificateFile } from '../services/certificateService';
import type { TranslatorCertificate } from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import {
	CERTIFICATE_STATUS_PRESENTATION,
	displayStatusOf,
} from '../utils/certificateStatus';
import { formatFileSize } from '../utils/profileFiles';

type CertificateDetailsModalProps = {
	certificate: TranslatorCertificate | null;
	isUnavailable: boolean;
	onClose: () => void;
	onUnavailable: (certificateId: string) => void;
	onReplace: (certificate: TranslatorCertificate) => void;
};

export function CertificateDetailsModal({
	certificate,
	isUnavailable,
	onClose,
	onUnavailable,
	onReplace,
}: CertificateDetailsModalProps) {
	const [isOpening, setIsOpening] = useState(false);
	const [openError, setOpenError] = useState<string | null>(null);

	if (!certificate) return null;

	const status = displayStatusOf(certificate.status, isUnavailable);
	const presentation = CERTIFICATE_STATUS_PRESENTATION[status];
	// CERTIFICADO APROVADO NAO PODE SER SUBSTITUIDO (O BACKEND RECUSA)
	const canReplace = certificate.status !== 'approved';

	function close() {
		setOpenError(null);
		onClose();
	}

	// O ARQUIVO FICA EM BUCKET PRIVADO: PEDE UM LINK TEMPORARIO A CADA VISUALIZACAO
	async function handleView() {
		if (!certificate) return;

		setIsOpening(true);
		setOpenError(null);
		try {
			const file = await getMyCertificateFile(certificate.id);
			openDocument(file.url);
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 404) {
				onUnavailable(certificate.id);
			} else {
				setOpenError('Não foi possível abrir o arquivo. Tente novamente.');
			}
		} finally {
			setIsOpening(false);
		}
	}

	return (
		<AppModal
			visible
			type={presentation.modalType}
			title={presentation.title}
			message={presentation.message}
			closeLabel="Fechar"
			onClose={close}
		>
			<View className="gap-3">
				<Text className="text-center font-inter font-semibold text-gray-800 text-sm">
					{certificate.language_name} ·{' '}
					{PROFICIENCY_LABELS[certificate.proficiency_level]}
				</Text>

				{certificate.status === 'rejected' && certificate.review_note && (
					<View className="rounded-lg bg-red-50 px-3 py-2.5">
						<Text className="font-inter text-red-900 text-sm">
							<Text className="font-semibold">Motivo da recusa: </Text>
							{certificate.review_note}
						</Text>
					</View>
				)}

				<View className="flex-row items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
					<FileText size={16} color="#6B7280" />
					<Text
						className="flex-1 font-inter text-gray-700 text-sm"
						numberOfLines={1}
					>
						{certificate.filename}
					</Text>
					<Text className="font-inter text-gray-400 text-xs">
						{formatFileSize(certificate.size_bytes)}
					</Text>
				</View>

				{isUnavailable && (
					<Text className="text-center font-inter text-gray-600 text-xs">
						{canReplace
							? 'Use “Substituir” para enviar o arquivo novamente.'
							: 'Procure o administrador para regularizar este certificado.'}
					</Text>
				)}

				{openError && (
					<Text className="text-center font-inter text-red-700 text-xs">
						{openError}
					</Text>
				)}

				<View className="flex-row flex-wrap gap-2">
					{!isUnavailable && (
						<TouchableOpacity
							onPress={() => void handleView()}
							disabled={isOpening}
							accessibilityRole="button"
							className={`min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 ${
								isOpening ? 'opacity-60' : ''
							}`}
						>
							{isOpening ? (
								<ActivityIndicator size="small" color="#374151" />
							) : (
								<Eye size={16} color="#374151" />
							)}
							<Text className="font-inter font-semibold text-gray-800 text-sm">
								Visualizar arquivo
							</Text>
						</TouchableOpacity>
					)}
					{canReplace && (
						<TouchableOpacity
							onPress={() => onReplace(certificate)}
							accessibilityRole="button"
							className="min-w-[140px] flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-blue-600 px-3 py-2.5"
						>
							<RefreshCw size={16} color="#1D4ED8" />
							<Text className="font-inter font-semibold text-blue-700 text-sm">
								Substituir
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</AppModal>
	);
}
