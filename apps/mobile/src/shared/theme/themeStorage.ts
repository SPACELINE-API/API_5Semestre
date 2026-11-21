import { Platform } from 'react-native';
import type { ThemeScheme } from './palette';

const STORAGE_KEY = 'spaceline.theme';
const FILE_NAME = 'theme-preference.txt';

function parse(value: string | null | undefined): ThemeScheme | null {
	const normalized = value?.trim();
	return normalized === 'dark' || normalized === 'light' ? normalized : null;
}

export function readStoredSchemeSync(): ThemeScheme | null {
	if (Platform.OS !== 'web') return null;
	try {
		return parse(globalThis.localStorage?.getItem(STORAGE_KEY));
	} catch {
		return null;
	}
}

export async function readStoredScheme(): Promise<ThemeScheme | null> {
	if (Platform.OS === 'web') return readStoredSchemeSync();
	try {
		const { File, Paths } = await import('expo-file-system');
		const file = new File(Paths.document, FILE_NAME);
		if (!file.exists) return null;
		return parse(await file.text());
	} catch {
		return null;
	}
}

export async function writeStoredScheme(scheme: ThemeScheme): Promise<void> {
	if (Platform.OS === 'web') {
		try {
			globalThis.localStorage?.setItem(STORAGE_KEY, scheme);
		} catch {
			return;
		}
		return;
	}
	try {
		const { File, Paths } = await import('expo-file-system');
		const file = new File(Paths.document, FILE_NAME);
		if (!file.exists) file.create();
		file.write(scheme);
	} catch {
		return;
	}
}
