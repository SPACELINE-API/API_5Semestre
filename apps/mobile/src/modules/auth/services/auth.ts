import { apiPost } from '../../../shared/services/publicApiClient';
import { request } from '../../../shared/services/publicApiClient';

export type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	user: { id: string; email: string; role?: string };
};

export type AuthorizationContext = {
	user: { id: string; email: string };
	roles: { id: string; name: string }[];
	permissions: string[];
};

type SessionListener = (userId: string | null) => void;

const sessionListeners = new Set<SessionListener>();

export function onSessionChange(listener: SessionListener) {
	sessionListeners.add(listener);
	return () => {
		sessionListeners.delete(listener);
	};
}

function notifySessionChange(userId: string | null) {
	sessionListeners.forEach((listener) => listener(userId));
}

let nativeSession: LoginResponse | null = null;
let authorizationContext: AuthorizationContext | null = null;
const SESSION_COOKIE = 'spaceline_session';
const authorizationListeners = new Set<() => void>();

function notifyAuthorizationChange() {
	authorizationListeners.forEach((listener) => listener());
}

export function subscribeAuthorizationContext(listener: () => void) {
	authorizationListeners.add(listener);
	return () => {
		authorizationListeners.delete(listener);
	};
}

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
	const previousUserId = getSession()?.user.id ?? null;
	nativeSession = session;
	authorizationContext = null;
	setCookie(
		SESSION_COOKIE,
		encodeCookieValue(session),
		remember ? session.expires_in : undefined,
	);
	if (previousUserId !== session.user.id) notifySessionChange(session.user.id);
}

export function getSession(): LoginResponse | null {
	const value = getCookie(SESSION_COOKIE);
	if (value) return decodeCookieValue<LoginResponse>(value);
	return nativeSession;
}

export function isTranslatorSession(): boolean {
	return getSession()?.user.role?.toLowerCase() === 'tradutor';
}

export function clearSession() {
	nativeSession = null;
	authorizationContext = null;
	deleteCookie(SESSION_COOKIE);
	notifySessionChange(null);
}

export function setAuthorizationContext(context: AuthorizationContext) {
	authorizationContext = {
		...context,
		permissions: Array.isArray(context.permissions) ? context.permissions : [],
	};
	notifyAuthorizationChange();
}

export async function loadAuthorizationContext() {
	if (authorizationContext) return authorizationContext;
	const session = getSession();
	if (!session) throw new Error('Sessão ausente.');
	const context = await request<AuthorizationContext>('/api/auth/me', {
		headers: { Authorization: `Bearer ${session.access_token}` },
	});
	authorizationContext = {
		...context,
		permissions: Array.isArray(context.permissions) ? context.permissions : [],
	};
	notifyAuthorizationChange();
	return authorizationContext;
}

export function refreshAuthorizationContext() {
	authorizationContext = null;
	return loadAuthorizationContext();
}

export function getAuthorizationContext() {
	return authorizationContext;
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
