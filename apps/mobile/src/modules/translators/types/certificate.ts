import type { NativeFile } from '../../../shared/types/file';
import type { ProficiencyLevel } from './translator';

export type CertificateStatus = 'pending' | 'approved' | 'rejected';

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
	pending: 'Em análise',
	approved: 'Aprovado',
	rejected: 'Recusado',
};

export type TranslatorCertificate = {
	id: string;
	translator_id: string;
	language_id: string;
	language_name: string;
	proficiency_level: ProficiencyLevel;
	filename: string;
	content_type: string;
	size_bytes: number;
	status: CertificateStatus;
	review_note: string | null;
	reviewed_at: string | null;
	created_at: string;
	updated_at: string;
};

export type CertifiableLanguage = {
	id: string;
	name: string;
};

export type CertificateFileLink = {
	url: string;
	expires_in: number;
};

export type SubmitCertificateInput = {
	languageId: string;
	proficiencyLevel: ProficiencyLevel;
	file: NativeFile;
};
