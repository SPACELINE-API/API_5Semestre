import { clearSession, getSession } from '../../modules/auth/services/auth';
import { router } from 'expo-router';
import { ApiError, apiUrl, extractErrorMessage, request } from './publicApiClient';

export { apiPost, apiUrl } from './publicApiClient';

function authHeaders(): Record<string, string> {
	const session = getSession();
	return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function authenticatedRequest<TResponse>(path: string, init?: RequestInit) {
	try {
		return await request<TResponse>(path, {
			...init,
			headers: { ...authHeaders(), ...init?.headers },
		});
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			clearSession();
			router.replace('/login' as never);
		}
		throw error;
	}
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
	return request<TResponse>(path);
}

export function apiPatch<TResponse, TBody>(path: string, body: TBody) {
	return request<TResponse>(path, {
		method: 'PATCH',
		body: JSON.stringify(body),
	});
}

export function apiPatchAuth<TResponse, TBody>(path: string, body: TBody) {
	return authenticatedRequest<TResponse>(path, {
		method: 'PATCH',
		body: JSON.stringify(body),
	});
}

export async function apiDelete(path: string): Promise<void> {
	const response = await fetch(`${apiUrl}${path}`, { method: 'DELETE' });

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(extractErrorMessage(payload, response.status));
	}
}

export async function apiGetAuth<TResponse>(path: string): Promise<TResponse> {
	return authenticatedRequest<TResponse>(path);
}

export function apiPostAuth<TResponse, TBody>(path: string, body: TBody) {
	return authenticatedRequest<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
	});
}
