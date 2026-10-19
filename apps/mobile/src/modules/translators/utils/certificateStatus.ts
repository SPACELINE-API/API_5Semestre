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
		badge: { background: 'bg-green-50', text: 'text-green-800' },
		modalType: 'success',
		title: 'Certificado válido',
		message:
			'O administrador aprovou este certificado e o idioma já faz parte do seu perfil.',
	},
	pending: {
		label: 'Em análise',
		badge: { background: 'bg-amber-50', text: 'text-amber-800' },
		modalType: 'warning',
		title: 'Certificado pendente',
		message:
			'O certificado foi recebido e aguarda a avaliação do administrador.',
	},
	rejected: {
		label: 'Recusado',
		badge: { background: 'bg-red-50', text: 'text-red-800' },
		modalType: 'error',
		title: 'Certificado recusado',
		message:
			'O administrador recusou este certificado. Envie um novo arquivo para nova avaliação.',
	},
	unavailable: {
		label: 'Indisponível',
		badge: { background: 'bg-gray-100', text: 'text-gray-700' },
		modalType: 'error',
		title: 'Certificado indisponível',
		message:
			'O arquivo deste certificado não foi encontrado no armazenamento. Envie o arquivo novamente.',
	},
};

export function displayStatusOf(
	status: CertificateStatus,
	isUnavailable: boolean,
): CertificateDisplayStatus {
	return isUnavailable ? 'unavailable' : status;
}
