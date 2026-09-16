import { apiPost } from '../../../shared/services/apiClient';

export type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	user: { id: string; email: string };
};

export type PasswordRecoveryResponse = {
	message: string;
};

const SESSION_COOKIE = 'spaceline_session';
const COOKIE_CONSENT = 'spaceline_cookie_consent';

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
	if (!isBrowser()) {
		return null;
	}

	const prefix = `${name}=`;
	const cookie = document.cookie
		.split('; ')
		.find((item) => item.startsWith(prefix));

	return cookie ? cookie.slice(prefix.length) : null;
}

function setCookie(name: string, value: string, maxAge?: number) {
	if (!isBrowser()) {
		return;
	}

	const expires = maxAge ? `; max-age=${maxAge}` : '';
	document.cookie = `${name}=${value}; path=/; SameSite=Lax${expires}`;
}

function deleteCookie(name: string) {
	if (!isBrowser()) {
		return;
	}

	document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export async function login(email: string, password: string) {
	return apiPost<LoginResponse, { email: string; password: string }>(
		'/api/auth/login',
		{ email, password },
	);
}

export function saveSession(session: LoginResponse, remember: boolean) {
	setCookie(
		SESSION_COOKIE,
		encodeCookieValue(session),
		remember ? session.expires_in : undefined,
	);
}

export async function requestPasswordRecovery(email: string) {
	return apiPost<PasswordRecoveryResponse, { email: string }>(
		'/api/auth/password-recovery',
		{ email },
	);
}

export async function resetPassword(
	accessToken: string,
	password: string,
	passwordConfirmation: string,
) {
	return apiPost<
		PasswordRecoveryResponse,
		{
			access_token: string;
			password: string;
			password_confirmation: string;
		}
	>('/api/auth/password-reset', {
		access_token: accessToken,
		password,
		password_confirmation: passwordConfirmation,
	});
}

export function getSession(): LoginResponse | null {
	const value = getCookie(SESSION_COOKIE);
	return value ? decodeCookieValue<LoginResponse>(value) : null;
}

export function clearSession() {
	deleteCookie(SESSION_COOKIE);
}

export function hasAcceptedCookies() {
	return getCookie(COOKIE_CONSENT) === 'accepted';
}

export function acceptCookies() {
	setCookie(COOKIE_CONSENT, 'accepted', 60 * 60 * 24 * 365);
}
