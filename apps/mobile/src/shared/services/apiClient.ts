import { env } from '../env';
import { getSession } from '../../modules/auth/services/auth';

export const apiUrl = env.apiUrl;

type FastApiValidationError = { msg?: string };

function extractErrorMessage(payload: unknown, status: number): string {
	const detail = (payload as { detail?: unknown } | null)?.detail;

	if (typeof detail === 'string') {
		return detail;
	}

	if (Array.isArray(detail)) {
		const messages = (detail as FastApiValidationError[])
			.map((error) => error.msg?.replace(/^Value error, /, ''))
			.filter((msg): msg is string => Boolean(msg));

		if (messages.length > 0) {
			return messages.join(' ');
		}
	}

	return `Request failed with status ${status}`;
}

function authHeaders(): Record<string, string> {
	const session = getSession();
	return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request<TResponse>(path: string, init?: RequestInit) {
	const response = await fetch(`${apiUrl}${path}`, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(extractErrorMessage(payload, response.status));
	}
	return response.json() as Promise<TResponse>;
}

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
	return request<TResponse>(path);
}

export function apiPost<TResponse, TBody>(path: string, body: TBody) {
	return request<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
	});
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
