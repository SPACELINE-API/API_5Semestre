import {
	apiGetAuth,
	apiUrl,
	authHeaders,
} from '../../../shared/services/apiClient';
import { toUploadable } from '../../../shared/utils/toUploadable';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
import type {
	CertifiableLanguage,
	CertificateFileLink,
	SubmitCertificateInput,
	TranslatorCertificate,
} from '../types/certificate';

const CERTIFICATES_PATH = '/api/translators/me/certificates';

export function listMyCertificates(): Promise<TranslatorCertificate[]> {
	return apiGetAuth<TranslatorCertificate[]>(CERTIFICATES_PATH);
}

export function listCertifiableLanguages(): Promise<CertifiableLanguage[]> {
	return apiGetAuth<CertifiableLanguage[]>(`${CERTIFICATES_PATH}/languages`);
}

export function getMyCertificateFile(
	certificateId: string,
): Promise<CertificateFileLink> {
	return apiGetAuth<CertificateFileLink>(
		`${CERTIFICATES_PATH}/${certificateId}/file`,
	);
}

export async function submitCertificate({
	languageId,
	proficiencyLevel,
	file,
}: SubmitCertificateInput): Promise<TranslatorCertificate> {
	return uploadFileMultipart<TranslatorCertificate>(
		`${apiUrl}${CERTIFICATES_PATH}`,
		await toUploadable(file),
		{ language_id: languageId, proficiency_level: proficiencyLevel },
		'POST',
		'file',
		authHeaders(),
	);
}
