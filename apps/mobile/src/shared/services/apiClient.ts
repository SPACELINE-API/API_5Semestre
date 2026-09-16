import { env } from '../env';

export const apiUrl = env.apiUrl;

async function request<TResponse>(path: string, init?: RequestInit) {
	const response = await fetch(`${apiUrl}${path}`, {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			payload?.detail ?? `Request failed with status ${response.status}`,
		);
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
