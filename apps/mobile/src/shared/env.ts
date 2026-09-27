const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

export const env = {
	apiUrl: configuredApiUrl || 'http://localhost:3333',
};
