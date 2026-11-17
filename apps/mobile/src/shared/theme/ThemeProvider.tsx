import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { colorScheme } from 'nativewind';
import { hex, type ThemeScheme, type ThemeToken } from './palette';
import {
	readStoredScheme,
	readStoredSchemeSync,
	writeStoredScheme,
} from './themeStorage';

type ThemeContextValue = {
	scheme: ThemeScheme;
	isDark: boolean;
	colors: Record<ThemeToken, string>;
	setScheme: (scheme: ThemeScheme) => void;
	toggleScheme: () => void;
};

const DEFAULT_SCHEME: ThemeScheme = 'light';

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
			colors: hex[scheme],
			setScheme,
			toggleScheme,
		}),
		[scheme, setScheme, toggleScheme],
	);

	if (!ready) return null;

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme deve ser usado dentro de ThemeProvider');
	}
	return context;
}

export function useThemeColors(): Record<ThemeToken, string> {
	return useTheme().colors;
}
