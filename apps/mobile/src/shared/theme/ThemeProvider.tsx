import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { colorScheme } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { hex, type ThemeScheme, type ThemeToken } from './palette';
import type { ThemeColors } from './types';
import {
	readStoredScheme,
	readStoredSchemeSync,
	writeStoredScheme,
} from './themeStorage';

type ThemeContextValue = {
	scheme: ThemeScheme;
	isDark: boolean;
	colors: ThemeColors;
	setScheme: (scheme: ThemeScheme) => void;
	toggleScheme: () => void;
};

const DEFAULT_SCHEME: ThemeScheme = 'light';

function toCamel(token: string) {
	return token.replace(/-([a-z])/g, (_, letter: string) =>
		letter.toUpperCase(),
	);
}

function buildColors(scheme: ThemeScheme): ThemeColors {
	return Object.fromEntries(
		(Object.keys(hex[scheme]) as ThemeToken[]).map((token) => [
			toCamel(token),
			hex[scheme][token],
		]),
	) as ThemeColors;
}

const camelColors: Record<ThemeScheme, ThemeColors> = {
	light: buildColors('light'),
	dark: buildColors('dark'),
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
	children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
	const [scheme, setSchemeState] = useState<ThemeScheme>(
		() => readStoredSchemeSync() ?? DEFAULT_SCHEME,
	);
	const [ready, setReady] = useState(() => readStoredSchemeSync() !== null);

	useEffect(() => {
		colorScheme.set(scheme);
		if (Platform.OS === 'web' && typeof document !== 'undefined') {
			document.documentElement.style.colorScheme = scheme;
			document.documentElement.style.backgroundColor =
				camelColors[scheme].background;
			document.body.style.backgroundColor = camelColors[scheme].background;
		} else if (Platform.OS !== 'web') {
			void SystemUI.setBackgroundColorAsync(camelColors[scheme].background);
		}
	}, [scheme]);

	useEffect(() => {
		if (ready) return;
		let active = true;
		readStoredScheme().then((stored) => {
			if (!active) return;
			if (stored) setSchemeState(stored);
			setReady(true);
		});
		return () => {
			active = false;
		};
	}, [ready]);

	const setScheme = useCallback((next: ThemeScheme) => {
		setSchemeState(next);
		void writeStoredScheme(next);
	}, []);

	const toggleScheme = useCallback(() => {
		setScheme(scheme === 'dark' ? 'light' : 'dark');
	}, [scheme, setScheme]);

	const value = useMemo<ThemeContextValue>(
		() => ({
			scheme,
			isDark: scheme === 'dark',
			colors: camelColors[scheme],
			setScheme,
			toggleScheme,
		}),
		[scheme, setScheme, toggleScheme],
	);

	if (!ready) return null;

	return (
		<ThemeContext.Provider value={value}>
			<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme deve ser usado dentro de ThemeProvider');
	}
	return context;
}

export function useThemeColors(): ThemeColors {
	return useTheme().colors;
}
