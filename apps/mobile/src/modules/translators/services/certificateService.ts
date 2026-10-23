import {
	apiGetAuth,
	apiPatchAuth,
	apiUrl,
} from '../../../shared/services/apiClient';
import { toUploadable } from '../../../shared/utils/toUploadable';
import { uploadFileMultipart } from '../../../shared/utils/uploadFileMultipart';
import type {
	CertifiableLanguage,
	CertificateFileLink,
	CertificateReviewInput,
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
	);
}

// ROTAS DO ADMINISTRADOR: CERTIFICADOS DE UM TRADUTOR ESPECIFICO
function translatorCertificatesPath(translatorId: string) {
	return `/api/translators/${translatorId}/certificates`;
}

export function listTranslatorCertificates(
	translatorId: string,
): Promise<TranslatorCertificate[]> {
	return apiGetAuth<TranslatorCertificate[]>(
		translatorCertificatesPath(translatorId),
	);
}

export function getTranslatorCertificateFile(
	translatorId: string,
	certificateId: string,
): Promise<CertificateFileLink> {
	return apiGetAuth<CertificateFileLink>(
		`${translatorCertificatesPath(translatorId)}/${certificateId}/file`,
	);
}

export function reviewCertificate(
	translatorId: string,
	certificateId: string,
	input: CertificateReviewInput,
): Promise<TranslatorCertificate> {
	return apiPatchAuth<TranslatorCertificate, CertificateReviewInput>(
		`${translatorCertificatesPath(translatorId)}/${certificateId}/review`,
		input,
	);
}
