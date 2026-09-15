import { env } from '../env';

export const apiUrl = env.apiUrl;

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
