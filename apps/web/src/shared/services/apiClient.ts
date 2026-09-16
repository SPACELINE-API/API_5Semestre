import { env } from '../env';

export const apiUrl = env.apiUrl;

export async function apiPost<TResponse, TBody>(
	path: string,
	body: TBody,
): Promise<TResponse> {
	const response = await fetch(`${apiUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(
			payload?.detail ?? `Request failed with status ${response.status}`,
		);
	}

	return response.json() as Promise<TResponse>;
}
