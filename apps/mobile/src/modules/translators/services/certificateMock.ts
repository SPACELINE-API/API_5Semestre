import type { ProficiencyLevel } from '../types/translator';

export type MockCertificateStatus = 'pending' | 'approved' | 'rejected';

export const MOCK_CERTIFICATE_STATUS_LABELS: Record<
	MockCertificateStatus,
	string
> = {
	pending: 'Em análise',
	approved: 'Aprovado',
	rejected: 'Recusado',
};

export type MockCertificateRequest = {
	id: string;
	language_name: string;
	proficiency_level: ProficiencyLevel;
	filename: string;
	status: MockCertificateStatus;
};

export const MOCK_CERTIFICATE_REQUESTS: MockCertificateRequest[] = [
	{
		id: 'mock-certificate-1',
		language_name: 'Espanhol',
		proficiency_level: 'advanced',
		filename: 'certificado-dele-b2.pdf',
		status: 'pending',
	},
	{
		id: 'mock-certificate-2',
		language_name: 'Francês',
		proficiency_level: 'fluent',
		filename: 'certificado-delf-c1.pdf',
		status: 'rejected',
	},
];
