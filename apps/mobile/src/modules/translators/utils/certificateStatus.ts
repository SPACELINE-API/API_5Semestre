import type { AppModalType } from '../../../shared/components/AppModal';
import type { CertificateStatus } from '../types/certificate';

/** "unavailable": o registro existe, mas o arquivo não está no Storage. */
export type CertificateDisplayStatus = CertificateStatus | 'unavailable';

type StatusPresentation = {
	label: string;
	badge: { background: string; text: string };
	modalType: AppModalType;
	title: string;
	message: string;
};

export const CERTIFICATE_STATUS_PRESENTATION: Record<
	CertificateDisplayStatus,
	StatusPresentation
> = {
	approved: {
		label: 'Válido',
		badge: { background: 'bg-success-soft', text: 'text-success-text' },
		modalType: 'success',
		title: 'Certificado válido',
		message:
			'O administrador aprovou este certificado e o idioma já faz parte do seu perfil.',
	},
	pending: {
		label: 'Em análise',
		badge: { background: 'bg-warning-soft', text: 'text-warning-text' },
		modalType: 'warning',
		title: 'Certificado pendente',
		message:
			'O certificado foi recebido e aguarda a avaliação do administrador.',
	},
	rejected: {
		label: 'Recusado',
		badge: { background: 'bg-danger-soft', text: 'text-danger-text' },
		modalType: 'error',
		title: 'Certificado recusado',
		message:
			'O administrador recusou este certificado. Envie um novo arquivo para nova avaliação.',
	},
	unavailable: {
		label: 'Indisponível',
		badge: {
			background: 'bg-surface-muted',
			text: 'text-foreground-secondary',
		},
		modalType: 'error',
		title: 'Certificado indisponível',
		message: 'O arquivo deste certificado não foi encontrado no armazenamento.',
	},
};

export function displayStatusOf(
	status: CertificateStatus,
	isUnavailable: boolean,
): CertificateDisplayStatus {
	return isUnavailable ? 'unavailable' : status;
}
