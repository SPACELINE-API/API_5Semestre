import { useState } from 'react';
import {
	ActivityIndicator,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, Eye, FileText, X } from 'lucide-react-native';
import {
	AppModal,
	type AppModalType,
} from '../../../shared/components/AppModal';
import { openDocument } from '../../../shared/components/FilePreview';
import { ApiError } from '../../../shared/services/publicApiClient';
import {
	getTranslatorCertificateFile,
	reviewCertificate,
} from '../services/certificateService';
import type {
	CertificateStatus,
	TranslatorCertificate,
} from '../types/certificate';
import { PROFICIENCY_LABELS } from '../types/translator';
import { formatFileSize } from '../utils/profileFiles';

type CertificateReviewModalProps = {
	translatorId: string;
	certificate: TranslatorCertificate | null;
	onClose: () => void;
	onReviewed: (certificate: TranslatorCertificate) => void;
};

type Step = 'details' | 'confirm-approve' | 'reject';

const DETAILS: Record<
	CertificateStatus,
	{ type: AppModalType; title: string; message: string }
> = {
	pending: {
		type: 'warning',
		title: 'Solicitação pendente',
		message: 'Confira o certificado enviado pelo tradutor e avalie.',
	},
	approved: {
		type: 'success',
		title: 'Certificado aprovado',
		message:
			'O idioma já faz parte do perfil do tradutor. O documento fica disponível apenas para visualização.',
	},
	rejected: {
		type: 'error',
		title: 'Certificado recusado',
		message: 'O tradutor pode enviar um novo arquivo para nova avaliação.',
	},
};

const REVIEW_NOTE_MAX = 500;

// AVALIACAO DO CERTIFICADO PELO ADMINISTRADOR: APROVADO OU RECUSADO SO PERMITE VISUALIZAR
export function CertificateReviewModal({
	translatorId,
	certificate,
	onClose,
	onReviewed,
}: CertificateReviewModalProps) {
	const [step, setStep] = useState<Step>('details');
	const [reviewNote, setReviewNote] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isOpening, setIsOpening] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	if (!certificate) return null;

	const languageLabel = `${certificate.language_name} · ${PROFICIENCY_LABELS[certificate.proficiency_level]}`;

	function close() {
		setStep('details');
		setReviewNote('');
		setActionError(null);
		onClose();
	}

	async function handleView() {
		if (!certificate) return;
		setIsOpening(true);
		setActionError(null);
		try {
			const file = await getTranslatorCertificateFile(
				translatorId,
				certificate.id,
			);
			openDocument(file.url);
		} catch (cause) {
			setActionError(
				cause instanceof ApiError && cause.status === 404
					? 'O arquivo deste certificado não foi encontrado no armazenamento.'
					: 'Não foi possível abrir o arquivo. Tente novamente.',
			);
		} finally {
			setIsOpening(false);
		}
	}

	async function submitReview(
		input: { status: 'approved' } | { status: 'rejected'; review_note: string },
	) {
		if (!certificate) return;
		setIsSaving(true);
		setActionError(null);
		try {
			const updated = await reviewCertificate(
				translatorId,
				certificate.id,
				input,
			);
			onReviewed(updated);
			close();
		} catch (cause) {
			setActionError(
				cause instanceof Error && cause.message
					? cause.message
					: 'Não foi possível registrar a avaliação. Tente novamente.',
			);
			setStep('details');
		} finally {
			setIsSaving(false);
		}
	}

	if (step === 'confirm-approve') {
		return (
			<AppModal
				visible
				type="confirmation"
				title="Aprovar certificado?"
				message={`${languageLabel} será adicionado aos idiomas do perfil do tradutor.`}
				confirmLabel="Aprovar"
				isLoading={isSaving}
				onConfirm={() => void submitReview({ status: 'approved' })}
				onClose={() => setStep('details')}
			/>
		);
	}

	if (step === 'reject') {
		const trimmedNote = reviewNote.trim();
		return (
			<AppModal
				visible
				title="Recusar certificado"
				message={`Informe o motivo da recusa de ${languageLabel}. O tradutor verá esta mensagem.`}
				confirmLabel="Recusar"
				confirmDisabled={!trimmedNote}
				isLoading={isSaving}
				onConfirm={() =>
					void submitReview({ status: 'rejected', review_note: trimmedNote })
				}
				onClose={() => setStep('details')}
			>
				<View className="gap-1.5">
					<Text className="font-inter font-medium text-gray-700 text-[13px]">
						Motivo da recusa
					</Text>
					<TextInput
						value={reviewNote}
						onChangeText={setReviewNote}
						multiline
						maxLength={REVIEW_NOTE_MAX}
						placeholder="Ex.: documento ilegível ou fora da validade"
						placeholderTextColor="#9CA3AF"
						accessibilityLabel="Motivo da recusa"
						textAlignVertical="top"
						className="min-h-[96px] rounded-lg border border-gray-300 px-3 py-2.5 font-inter text-sm text-gray-900 outline-none"
					/>
					<Text className="self-end font-inter text-gray-400 text-xs">
						{reviewNote.length}/{REVIEW_NOTE_MAX}
					</Text>
				</View>
			</AppModal>
		);
	}

	const details = DETAILS[certificate.status];
	const isPending = certificate.status === 'pending';

	return (
		<AppModal
			visible
			type={details.type}
			title={details.title}
			message={details.message}
			closeLabel="Fechar"
			onClose={close}
		>
			<View className="gap-3">
				<Text className="text-center font-inter font-semibold text-gray-800 text-sm">
					{languageLabel}
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

				{actionError && (
					<Text className="text-center font-inter text-red-700 text-xs">
						{actionError}
					</Text>
				)}

				<TouchableOpacity
					onPress={() => void handleView()}
					disabled={isOpening}
					accessibilityRole="button"
					className={`flex-row items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2.5 ${
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

				{isPending && (
					<View className="flex-row gap-2">
						<TouchableOpacity
							onPress={() => setStep('reject')}
							accessibilityRole="button"
							className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2.5"
						>
							<X size={16} color="#B91C1C" />
							<Text className="font-inter font-semibold text-red-700 text-sm">
								Recusar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={() => setStep('confirm-approve')}
							accessibilityRole="button"
							className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5"
						>
							<Check size={16} color="#FFFFFF" />
							<Text className="font-inter font-semibold text-sm text-white">
								Aprovar
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		</AppModal>
	);
}
