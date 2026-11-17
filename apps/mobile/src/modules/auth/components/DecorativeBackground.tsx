import { useMemo } from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';
import Svg, {
	Circle,
	Defs,
	LinearGradient,
	Path,
	Rect,
	Stop,
} from 'react-native-svg';

import { useTheme } from '../../../shared/theme/ThemeProvider';
function wavePath(
	width: number,
	height: number,
	baseline: number,
	amplitude: number,
	phase: number,
) {
	const y = height * baseline;
	const a = height * amplitude;
	const p = phase;
	return [
		`M 0 ${y + a * p}`,
		`C ${width * 0.22} ${y - a * (1 - p)}, ${width * 0.42} ${y + a * (1 + p)}, ${width * 0.62} ${y}`,
		`S ${width * 0.88} ${y - a * (1 + p)}, ${width} ${y - a * p}`,
		`L ${width} ${height}`,
		`L 0 ${height}`,
		'Z',
	].join(' ');
}

const PALETTES = {
	light: {
		circleA: '#ffffff',
		circleB: '#f8fbff',
		circleC: '#b8dafa',
		circleD: '#c2e1fa',
		skyTop: '#eef6ff',
		skyBottom: '#d3e8fc',
		farA: '#5ba3e6',
		farB: '#3f8fdc',
		nearA: '#2f7fd1',
		nearB: '#2569b8',
	},
	dark: {
		circleA: '#1b2a3d',
		circleB: '#16243a',
		circleC: '#1f4a7a',
		circleD: '#1b3d66',
		skyTop: '#0d1722',
		skyBottom: '#101f31',
		farA: '#1d4f86',
		farB: '#18416f',
		nearA: '#143a63',
		nearB: '#0f2f50',
	},
};

export function DecorativeBackground() {
	const { isDark } = useTheme();
	const palette = PALETTES[isDark ? 'dark' : 'light'];
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const width = Math.max(windowWidth, 1);
	const height = Math.max(windowHeight, 1);
	const reference = Math.min(width, height);
	const isPortrait = height > width;

	const shapes = useMemo(
		() => ({
			farWave: wavePath(width, height, isPortrait ? 0.86 : 0.8, 0.05, 0.4),
			nearWave: wavePath(width, height, isPortrait ? 0.92 : 0.89, 0.04, -0.3),
			circles: [
				{
					cx: width * 0.08,
					cy: height * 0.18,
					r: reference * 0.42,
					fill: palette.circleA,
					opacity: 0.55,
				},
				{
					cx: width * 0.94,
					cy: height * 0.12,
					r: reference * 0.34,
					fill: palette.circleB,
					opacity: 0.75,
				},
				{
					cx: width * 0.9,
					cy: height * 0.55,
					r: reference * 0.46,
					fill: palette.circleC,
					opacity: 0.32,
				},
				{
					cx: width * 0.02,
					cy: height * 0.62,
					r: reference * 0.3,
					fill: palette.circleD,
					opacity: 0.45,
				},
			],
		}),
		[width, height, reference, isPortrait, palette],
	);

	const containerStyle =
		Platform.OS === 'web'
			? ({
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
				} as never)
			: undefined;

	return (
		<View
			pointerEvents="none"
			className="absolute inset-0 overflow-hidden bg-primary-soft"
			style={containerStyle}
		>
			<Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<Defs>
					<LinearGradient id="loginSky" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0" stopColor={palette.skyTop} />
						<Stop offset="1" stopColor={palette.skyBottom} />
					</LinearGradient>
					<LinearGradient id="loginWaveFar" x1="0" y1="0" x2="1" y2="0">
						<Stop offset="0" stopColor={palette.farA} />
						<Stop offset="1" stopColor={palette.farB} />
					</LinearGradient>
					<LinearGradient id="loginWaveNear" x1="0" y1="0" x2="1" y2="0">
						<Stop offset="0" stopColor={palette.nearA} />
						<Stop offset="1" stopColor={palette.nearB} />
					</LinearGradient>
				</Defs>
				<Rect width={width} height={height} fill="url(#loginSky)" />
				{shapes.circles.map((circle, index) => (
					<Circle
						key={index}
						cx={circle.cx}
						cy={circle.cy}
						r={circle.r}
						fill={circle.fill}
						opacity={circle.opacity}
					/>
				))}
				<Path d={shapes.farWave} fill="url(#loginWaveFar)" opacity={0.7} />
				<Path d={shapes.nearWave} fill="url(#loginWaveNear)" />
			</Svg>
		</View>
	);
}
