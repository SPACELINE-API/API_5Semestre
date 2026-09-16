import { apiPost } from '../../../shared/services/apiClient';

export type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	user: { id: string; email: string };
};

let nativeSession: LoginResponse | null = null;
const key = 'spaceline_session';

export function login(email: string, password: string) {
	return apiPost<LoginResponse, { email: string; password: string }>('/api/auth/login', { email, password });
}

export function saveSession(session: LoginResponse) {
	nativeSession = session;
	if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(session));
}

export function getSession(): LoginResponse | null {
	if (typeof localStorage !== 'undefined') {
		const value = localStorage.getItem(key);
		if (value) return JSON.parse(value) as LoginResponse;
	}
	return nativeSession;
}

export function clearSession() {
	nativeSession = null;
	if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
}

export function requestPasswordRecovery(email: string) {
	return apiPost<{ message: string }, { email: string }>('/api/auth/password-recovery', { email });
}

export function resetPassword(access_token: string, password: string, password_confirmation: string) {
	return apiPost<{ message: string }, { access_token: string; password: string; password_confirmation: string }>(
		'/api/auth/password-reset', { access_token, password, password_confirmation },
	);
}
