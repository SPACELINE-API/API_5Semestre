import type { ThemeColors } from '../../theme/types';
import type { ChartOption } from './types';

function neutralMap(colors: ThemeColors): Record<string, string> {
	return {
		'#353535': colors.foreground,
		'#8a8a8a': colors.foregroundMuted,
		'#f0f0f0': colors.border,
		'#ffffff': colors.surface,
	};
}

function recolor(value: unknown, map: Record<string, string>): unknown {
	if (typeof value === 'string') return map[value.toLowerCase()] ?? value;
	if (Array.isArray(value)) return value.map((item) => recolor(item, map));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, recolor(item, map)]),
		);
	}
	return value;
}

export function themeChartOption(
	option: ChartOption,
	colors: ThemeColors,
): ChartOption {
	const recolored = recolor(option, neutralMap(colors)) as Record<
		string,
		unknown
	>;
	const tooltip = (recolored.tooltip ?? {}) as Record<string, unknown>;
	return {
		backgroundColor: 'transparent',
		...recolored,
		tooltip: {
			backgroundColor: colors.surface,
			borderColor: colors.border,
			textStyle: { color: colors.foreground },
			...tooltip,
		},
	} as ChartOption;
}
