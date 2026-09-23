import { getSession } from '../../modules/auth/services/auth';
import { apiUrl, extractErrorMessage, request } from './publicApiClient';

export { apiPost, apiUrl } from './publicApiClient';

function authHeaders(): Record<string, string> {
	const session = getSession();
	return session ? { Authorization: `Bearer ${session.access_token}` } : {};
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

export async function apiDelete(path: string): Promise<void> {
	const response = await fetch(`${apiUrl}${path}`, { method: 'DELETE' });

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(extractErrorMessage(payload, response.status));
	}
}

export async function apiGetAuth<TResponse>(path: string): Promise<TResponse> {
	return request<TResponse>(path, { headers: authHeaders() });
}

export function apiPostAuth<TResponse, TBody>(path: string, body: TBody) {
	return request<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
		headers: authHeaders(),
	});
}
