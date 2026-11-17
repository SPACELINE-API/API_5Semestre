export type ThemeToken =
	| 'background'
	| 'surface'
	| 'surface-subtle'
	| 'surface-muted'
	| 'border-subtle'
	| 'border'
	| 'border-strong'
	| 'foreground'
	| 'foreground-secondary'
	| 'foreground-muted'
	| 'foreground-subtle'
	| 'foreground-inverse'
	| 'primary'
	| 'primary-hover'
	| 'primary-soft'
	| 'primary-text'
	| 'primary-strong'
	| 'primary-foreground'
	| 'success'
	| 'success-soft'
	| 'success-text'
	| 'warning'
	| 'warning-soft'
	| 'warning-text'
	| 'danger'
	| 'danger-soft'
	| 'danger-text'
	| 'overlay';

export type ThemeScheme = 'light' | 'dark';

export const tokens: ThemeToken[];
export const rgb: Record<
	ThemeScheme,
	Record<ThemeToken, [number, number, number]>
>;
export const hex: Record<ThemeScheme, Record<ThemeToken, string>>;
