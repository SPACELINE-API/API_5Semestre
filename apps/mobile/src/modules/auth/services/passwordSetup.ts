import { apiPost, request } from '../../../shared/services/publicApiClient';

export type PasswordSetupLinkStatus =
	'pendente' | 'aceito' | 'rejeitado' | 'expirado';

export type PasswordSetupLinkInfo = {
	status: PasswordSetupLinkStatus;
	name: string | null;
	email: string | null;
	expires_at: string;
};

export function getPasswordSetupLink(token: string) {
	return request<PasswordSetupLinkInfo>(
		`/api/auth/password-setup/${encodeURIComponent(token)}`,
	);
}

export function definePassword(
	token: string,
	password: string,
	password_confirmation: string,
) {
	return apiPost<
		{ message: string },
		{ token: string; password: string; password_confirmation: string }
	>('/api/auth/password-setup', { token, password, password_confirmation });
}
