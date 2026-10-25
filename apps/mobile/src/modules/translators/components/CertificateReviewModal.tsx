import { useState } from 'react';
import {
	ActivityIndicator,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	Check,
	CheckCircle2,
	Clock,
	ExternalLink,
	Eye,
	X,
	XCircle,
} from 'lucide-react-native';
import { AppModal } from '../../../shared/components/AppModal';
import {
	FilePreview,
	openDocument,
} from '../../../shared/components/FilePreview';
import { ApiError } from '../../../shared/services/publicApiClient';
import {
	getTranslatorCertificateFile,
	reviewCertificate,
} from '../services/certificateService';
import {
	CERTIFICATE_STATUS_LABELS,
	type CertificateStatus,
	type TranslatorCertificate,
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

const BANNERS: Record<
	CertificateStatus,
	{
		icon: typeof Clock;
		color: string;
		background: string;
		border: string;
		title: string;
		message: string;
	}
> = {
	pending: {
		icon: Clock,
		color: '#B45309',
		background: 'bg-amber-50',
		border: 'border-amber-200',
		title: 'Aguardando avaliação',
		message:
			'Confira o documento e avalie. Ao aprovar, o idioma entra no perfil do tradutor.',
	},
	approved: {
		icon: CheckCircle2,
		color: '#15803D',
		background: 'bg-green-50',
		border: 'border-green-200',
		title: 'Certificado aprovado',
		message:
			'O idioma já faz parte do perfil do tradutor. O documento fica disponível apenas para visualização.',
	},
	rejected: {
		icon: XCircle,
		color: '#B91C1C',
		background: 'bg-red-50',
		border: 'border-red-200',
		title: 'Certificado recusado',
		message: 'O tradutor pode enviar um novo arquivo para nova avaliação.',
	},
};

const REVIEW_NOTE_MAX = 500;
const PREVIEW_HEIGHT = 280;

function formatDateTime(value: string) {
	const date = new Date(value);
	return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString(
		'pt-BR',
		{ hour: '2-digit', minute: '2-digit' },
	)}`;
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<View className="min-w-[140px] flex-1 gap-0.5">
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
			<Text className="font-inter font-medium text-gray-800 text-sm">
				{value}
			</Text>
		</View>
	);
}

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
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	if (!certificate) return null;

	const languageLabel = `${certificate.language_name} · ${PROFICIENCY_LABELS[certificate.proficiency_level]}`;

	function close() {
		setStep('details');
		setReviewNote('');
		setPreviewUrl(null);
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
			if (Platform.OS === 'web') setPreviewUrl(file.url);
			else openDocument(file.url);
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
				key="confirm-approve"
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
				key="reject"
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

	const banner = BANNERS[certificate.status];
	const BannerIcon = banner.icon;
	const isPending = certificate.status === 'pending';

	const footer = isPending ? (
		<>
			<TouchableOpacity
				onPress={() => setStep('reject')}
				accessibilityRole="button"
				accessibilityLabel="Recusar certificado"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5"
			>
				<X size={16} color="#B91C1C" />
				<Text className="font-inter font-semibold text-red-700 text-sm">
					Recusar
				</Text>
			</TouchableOpacity>
			<TouchableOpacity
				onPress={() => setStep('confirm-approve')}
				accessibilityRole="button"
				accessibilityLabel="Aprovar certificado"
				className="flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5"
			>
				<Check size={16} color="#FFFFFF" />
				<Text className="font-inter font-semibold text-sm text-white">
					Aprovar
				</Text>
			</TouchableOpacity>
		</>
	) : (
		<TouchableOpacity
			onPress={close}
			accessibilityRole="button"
			className="flex-1 items-center rounded-lg bg-blue-600 px-4 py-2.5"
		>
			<Text className="font-inter font-semibold text-sm text-white">
				Fechar
			</Text>
		</TouchableOpacity>
	);

	return (
		<AppModal
			key="details"
			visible
			size="md"
			title={`Certificado de ${certificate.language_name}`}
			message={`Enviado por ${languageLabel}`}
			footer={footer}
			onClose={close}
		>
			<View className="gap-4">
				<View
					className={`flex-row items-start gap-3 rounded-xl border px-4 py-3 ${banner.background} ${banner.border}`}
				>
					<BannerIcon size={18} color={banner.color} />
					<View className="flex-1 gap-0.5">
						<Text className="font-inter font-semibold text-gray-900 text-sm">
							{banner.title}
						</Text>
						<Text className="font-inter text-gray-600 text-xs">
							{banner.message}
						</Text>
					</View>
				</View>

				<View className="flex-row flex-wrap gap-x-4 gap-y-3 rounded-xl border border-gray-200 p-4">
					<InfoItem label="Idioma" value={certificate.language_name} />
					<InfoItem
						label="Nível declarado"
						value={PROFICIENCY_LABELS[certificate.proficiency_level]}
					/>
					<InfoItem
						label="Situação"
						value={CERTIFICATE_STATUS_LABELS[certificate.status]}
					/>
					<InfoItem
						label="Enviado em"
						value={formatDateTime(certificate.updated_at)}
					/>
					<InfoItem
						label="Arquivo"
						value={`${certificate.filename} · ${formatFileSize(certificate.size_bytes)}`}
					/>
					{certificate.reviewed_at && (
						<InfoItem
							label="Avaliado em"
							value={formatDateTime(certificate.reviewed_at)}
						/>
					)}
				</View>

				{certificate.status === 'rejected' && certificate.review_note && (
					<View className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
						<Text className="font-inter text-red-900 text-sm">
							<Text className="font-semibold">Motivo da recusa: </Text>
							{certificate.review_note}
						</Text>
					</View>
				)}

				{previewUrl ? (
					<View className="gap-2">
						<FilePreview fileUrl={previewUrl} height={PREVIEW_HEIGHT} />
						<TouchableOpacity
							onPress={() => openDocument(previewUrl)}
							accessibilityRole="link"
							className="flex-row items-center gap-1.5 self-start"
						>
							<ExternalLink size={13} color="#1C6FB0" />
							<Text className="font-inter font-medium text-blue-600 text-xs">
								Abrir em nova aba
							</Text>
						</TouchableOpacity>
					</View>
				) : (
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
							Visualizar documento
						</Text>
					</TouchableOpacity>
				)}

				{actionError && (
					<View className="rounded-lg bg-red-50 px-3 py-2.5">
						<Text className="font-inter text-red-900 text-sm">
							{actionError}
						</Text>
					</View>
				)}
			</View>
		</AppModal>
	);
}
