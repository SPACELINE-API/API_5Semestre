import { Platform, useWindowDimensions, View } from 'react-native';
import Svg, {
	Circle,
	Defs,
	LinearGradient,
	Pattern,
	RadialGradient,
	Rect,
	Stop,
} from 'react-native-svg';

import { useTheme } from '../../../shared/theme/ThemeProvider';
const DOT_GAP = 14;

const PALETTES = {
	light: {
		circleStrong: '#3a86c0',
		circleMid: '#9cbfdc',
		circleSoft: '#c3dcf3',
		circleFaint: '#cfe2f5',
		glow0: '#3b9be6',
		glow1: '#74bff5',
		glow2: '#bfe0f9',
		dotBlue: '#8fb8dd',
		base: '#f6faff',
		white: '#ffffff',
	},
	dark: {
		circleStrong: '#1f5b94',
		circleMid: '#2a4a6b',
		circleSoft: '#1d3350',
		circleFaint: '#233f5f',
		glow0: '#1c4f86',
		glow1: '#173f6b',
		glow2: '#112d4c',
		dotBlue: '#2a4766',
		base: '#0d1520',
		white: '#0d1520',
	},
};

export function LoginBackground() {
	const { isDark } = useTheme();
	const palette = PALETTES[isDark ? 'dark' : 'light'];
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const width = Math.max(windowWidth, 1);
	const height = Math.max(windowHeight, 1);
	const isPortrait = height > width * 1.05;
	const reference = Math.min(width, height);

	const glow = isPortrait
		? { cx: width * 0.95, cy: height * 0.92, r: height * 0.85 }
		: {
				cx: width * 0.95,
				cy: height * 0.42,
				r: Math.max(width * 0.82, height),
			};

	const circles = isPortrait
		? [
				{
					cx: width * 0.92,
					cy: height * 0.08,
					r: reference * 0.32,
					fill: palette.circleStrong,
					opacity: 0.4,
				},
				{
					cx: width * 0.78,
					cy: height * 0.9,
					r: reference * 0.34,
					fill: palette.circleMid,
					opacity: 0.45,
				},
				{
					cx: width * 0.08,
					cy: height * 0.96,
					r: reference * 0.3,
					fill: palette.circleSoft,
					opacity: 0.8,
				},
			]
		: [
				{
					cx: width * 0.9,
					cy: height * 0.2,
					r: Math.min(width * 0.16, height * 0.3),
					fill: palette.circleStrong,
					opacity: 0.42,
				},
				{
					cx: width * 0.57,
					cy: height * 0.57,
					r: Math.min(width * 0.15, height * 0.22),
					fill: palette.circleMid,
					opacity: 0.45,
				},
				{
					cx: width * 0.47,
					cy: height * 0.79,
					r: Math.min(width * 0.08, height * 0.12),
					fill: palette.circleFaint,
					opacity: 0.7,
				},
				{
					cx: width * 0.07,
					cy: height * 0.9,
					r: Math.min(width * 0.12, height * 0.17),
					fill: palette.circleSoft,
					opacity: 0.85,
				},
			];

	const dots = isPortrait
		? [
				{ x: width * 0.58, y: height * 0.7, w: width * 0.4, h: height * 0.2 },
				{ x: 0, y: height * 0.02, w: width * 0.3, h: height * 0.12 },
			]
		: [
				{ x: width * 0.72, y: height * 0.1, w: width * 0.25, h: height * 0.38 },
				{ x: width * 0.68, y: height * 0.88, w: width * 0.32, h: height * 0.1 },
				{ x: 0, y: height * 0.04, w: width * 0.2, h: height * 0.42 },
				{ x: width * 0.02, y: height * 0.84, w: width * 0.2, h: height * 0.14 },
			];

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
			className="absolute inset-0 overflow-hidden bg-surface-subtle"
			style={containerStyle}
		>
			<Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
				<Defs>
					<RadialGradient
						id="loginGlow"
						gradientUnits="userSpaceOnUse"
						cx={glow.cx}
						cy={glow.cy}
						r={glow.r}
					>
						<Stop offset="0" stopColor={palette.glow0} stopOpacity="1" />
						<Stop offset="0.42" stopColor={palette.glow1} stopOpacity="1" />
						<Stop offset="0.72" stopColor={palette.glow2} stopOpacity="0.55" />
						<Stop offset="1" stopColor={palette.white} stopOpacity="0" />
					</RadialGradient>
					<LinearGradient id="loginShade" x1="0" y1="0" x2="1" y2="0">
						<Stop offset="0" stopColor={palette.white} stopOpacity="0.9" />
						<Stop offset="0.55" stopColor={palette.white} stopOpacity="0" />
					</LinearGradient>
					<Pattern
						id="loginDots"
						patternUnits="userSpaceOnUse"
						width={DOT_GAP}
						height={DOT_GAP}
					>
						<Circle
							cx={DOT_GAP / 2}
							cy={DOT_GAP / 2}
							r={1.3}
							fill={palette.white}
						/>
					</Pattern>
					<Pattern
						id="loginDotsBlue"
						patternUnits="userSpaceOnUse"
						width={DOT_GAP}
						height={DOT_GAP}
					>
						<Circle
							cx={DOT_GAP / 2}
							cy={DOT_GAP / 2}
							r={1.3}
							fill={palette.dotBlue}
						/>
					</Pattern>
				</Defs>
				<Rect width={width} height={height} fill={palette.base} />
				<Rect width={width} height={height} fill="url(#loginGlow)" />
				{!isPortrait && (
					<Rect width={width * 0.6} height={height} fill="url(#loginShade)" />
				)}
				{circles.map((circle, index) => (
					<Circle
						key={`circle-${index}`}
						cx={circle.cx}
						cy={circle.cy}
						r={circle.r}
						fill={circle.fill}
						opacity={circle.opacity}
					/>
				))}
				{dots.map((area, index) => {
					const onBlue = area.x + area.w / 2 > width * 0.55;
					return (
						<Rect
							key={`dots-${index}`}
							x={area.x}
							y={area.y}
							width={area.w}
							height={area.h}
							fill={onBlue ? 'url(#loginDots)' : 'url(#loginDotsBlue)'}
							opacity={onBlue ? 0.75 : 0.55}
						/>
					);
				})}
			</Svg>
		</View>
	);
}
