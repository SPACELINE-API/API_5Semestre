import { env } from '../env';

export const apiUrl = env.apiUrl;

type FastApiValidationError = { msg?: string };

export function extractErrorMessage(payload: unknown, status: number): string {
	const detail = (payload as { detail?: unknown } | null)?.detail;

	if (typeof detail === 'string') return detail;

	if (Array.isArray(detail)) {
		const messages = (detail as FastApiValidationError[])
			.map((error) => error.msg?.replace(/^Value error, /, ''))
			.filter((msg): msg is string => Boolean(msg));

		if (messages.length > 0) return messages.join(' ');
	}

	return `Request failed with status ${status}`;
}

export async function request<TResponse>(path: string, init?: RequestInit) {
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

export function apiPost<TResponse, TBody>(path: string, body: TBody) {
	return request<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
	});
}
