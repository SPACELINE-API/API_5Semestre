const fallbackApiUrl = "http://localhost:8000";

export const apiUrl = import.meta.env.VITE_API_URL || fallbackApiUrl;

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  const response = await fetch(`${apiUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}
