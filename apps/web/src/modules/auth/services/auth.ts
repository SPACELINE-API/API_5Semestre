import { apiPost } from '../../../shared/services/apiClient';

export type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	user: { id: string; email: string };
};

const STORAGE_KEY = 'spaceline.auth';

export async function login(email: string, password: string) {
	return apiPost<LoginResponse, { email: string; password: string }>('/api/auth/login', { email, password });
}

export function saveSession(session: LoginResponse, remember: boolean) {
	const storage = remember ? localStorage : sessionStorage;
	storage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): LoginResponse | null {
	const value = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
	return value ? (JSON.parse(value) as LoginResponse) : null;
}

export function clearSession() {
	localStorage.removeItem(STORAGE_KEY);
	sessionStorage.removeItem(STORAGE_KEY);
}
