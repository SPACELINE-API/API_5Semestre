import { env } from '../env';

export type Language = {
	id: string;
	name: string;
};

const API_BASE_URL = env.apiUrl;

export async function fetchLanguages(): Promise<Language[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/support/languages`);
		if (!response.ok) {
			throw new Error('Failed to fetch languages');
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error fetching languages:", error);
		return [];
	}
}

export async function createLanguage(id: string, name: string): Promise<Language | null> {
	try {
		const response = await fetch(`${API_BASE_URL}/api/support/languages`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, name }),
		});

		if (!response.ok) {
			throw new Error('Failed to create language');
		}
		const data = await response.json();
		return data;
	} catch (error) {
		console.error("Error creating language:", error);
		return null;
	}
}
