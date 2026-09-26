import { env } from '../env';

export const apiUrl = env.apiUrl;

type FastApiValidationError = { msg?: string };

export type ApiErrorKind = 'network' | 'http';

export class ApiError extends Error {
	constructor(
		message: string,
		readonly kind: ApiErrorKind,
		readonly status?: number,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

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
	let response: Response;
	try {
		response = await fetch(`${apiUrl}${path}`, {
			...init,
			headers: { 'Content-Type': 'application/json', ...init?.headers },
		});
	} catch {
		throw new ApiError(
			'Não foi possível conectar à API.',
			'network',
		);
	}
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new ApiError(
			extractErrorMessage(payload, response.status),
			'http',
			response.status,
		);
	}
	return response.json() as Promise<TResponse>;
}

export function apiPost<TResponse, TBody>(path: string, body: TBody) {
	return request<TResponse>(path, {
		method: 'POST',
		body: JSON.stringify(body),
	});
}
