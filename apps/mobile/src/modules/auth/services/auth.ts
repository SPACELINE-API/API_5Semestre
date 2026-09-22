import { apiPost } from '../../../shared/services/publicApiClient';

export type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	user: { id: string; email: string };
};

let nativeSession: LoginResponse | null = null;
const SESSION_COOKIE = 'spaceline_session';

function isBrowser() {
	return typeof document !== 'undefined';
}

function encodeCookieValue(value: unknown) {
	return encodeURIComponent(JSON.stringify(value));
}

function decodeCookieValue<T>(value: string): T | null {
	try {
		return JSON.parse(decodeURIComponent(value)) as T;
	} catch {
		return null;
	}
}

function getCookie(name: string) {
	if (!isBrowser()) return null;
	const prefix = `${name}=`;
	const cookie = document.cookie
		.split('; ')
		.find((item) => item.startsWith(prefix));
	return cookie ? cookie.slice(prefix.length) : null;
}

function setCookie(name: string, value: string, maxAge?: number) {
	if (!isBrowser()) return;
	const expires = maxAge ? `; max-age=${maxAge}` : '';
	document.cookie = `${name}=${value}; path=/; SameSite=Lax${expires}`;
}

function deleteCookie(name: string) {
	if (!isBrowser()) return;
	document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function login(email: string, password: string) {
	return apiPost<LoginResponse, { email: string; password: string }>(
		'/api/auth/login',
		{ email, password },
	);
}

export function saveSession(session: LoginResponse, remember = false) {
	nativeSession = session;
	setCookie(
		SESSION_COOKIE,
		encodeCookieValue(session),
		remember ? session.expires_in : undefined,
	);
}

export function getSession(): LoginResponse | null {
	const value = getCookie(SESSION_COOKIE);
	if (value) return decodeCookieValue<LoginResponse>(value);
	return nativeSession;
}

export function clearSession() {
	nativeSession = null;
	deleteCookie(SESSION_COOKIE);
}

export function requestPasswordRecovery(email: string) {
	return apiPost<{ message: string }, { email: string }>(
		'/api/auth/password-recovery',
		{ email },
	);
}

export function resetPassword(
	access_token: string,
	password: string,
	password_confirmation: string,
) {
	return apiPost<
		{ message: string },
		{ access_token: string; password: string; password_confirmation: string }
	>('/api/auth/password-reset', {
		access_token,
		password,
		password_confirmation,
	});
}
