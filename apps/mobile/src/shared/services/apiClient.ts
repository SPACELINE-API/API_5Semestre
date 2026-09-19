import { env } from '../env';

export const apiUrl = env.apiUrl;

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
	const response = await fetch(`${apiUrl}${path}`);

	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
	}

	return response.json() as Promise<TResponse>;
}

async function apiSend<TResponse, TBody>(
	method: 'POST' | 'PATCH',
	path: string,
	body: TBody,
): Promise<TResponse> {
	const response = await fetch(`${apiUrl}${path}`, {
		method,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			detail?: string;
		} | null;

		throw new Error(
			payload?.detail ?? `Request failed with status ${response.status}`,
		);
	}

	return response.json() as Promise<TResponse>;
}

export function apiPost<TResponse, TBody>(
	path: string,
	body: TBody,
): Promise<TResponse> {
	return apiSend<TResponse, TBody>('POST', path, body);
}

export function apiPatch<TResponse, TBody>(
	path: string,
	body: TBody,
): Promise<TResponse> {
	return apiSend<TResponse, TBody>('PATCH', path, body);
}

export async function apiDelete(path: string): Promise<void> {
	const response = await fetch(`${apiUrl}${path}`, { method: 'DELETE' });

	if (!response.ok) {
		const payload = (await response.json().catch(() => null)) as {
			detail?: string;
		} | null;

		throw new Error(
			payload?.detail ?? `Request failed with status ${response.status}`,
		);
	}
}
