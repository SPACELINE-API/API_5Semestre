import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from './ThemeProvider';

const TRACK_WIDTH = 64;
const TRACK_HEIGHT = 34;
const THUMB_SIZE = 26;
const PADDING = (TRACK_HEIGHT - THUMB_SIZE) / 2;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2 - 2;

export function ThemeToggle() {
	const { isDark, toggleScheme, colors } = useTheme();
	const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

	useEffect(() => {
		Animated.timing(progress, {
			toValue: isDark ? 1 : 0,
			duration: 380,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: true,
		}).start();
	}, [isDark, progress]);

	const translateX = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, TRAVEL],
	});
	const sunOpacity = progress.interpolate({
		inputRange: [0, 0.5],
		outputRange: [1, 0],
		extrapolate: 'clamp',
	});
	const moonOpacity = progress.interpolate({
		inputRange: [0.5, 1],
		outputRange: [0, 1],
		extrapolate: 'clamp',
	});
	const sunRotate = progress.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '90deg'],
	});
	const moonRotate = progress.interpolate({
		inputRange: [0, 1],
		outputRange: ['-90deg', '0deg'],
	});
	const nightOpacity = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 1],
	});

	return (
		<Pressable
			onPress={toggleScheme}
			accessibilityRole="switch"
			accessibilityState={{ checked: isDark }}
			accessibilityLabel={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
			hitSlop={8}
			style={{
				width: TRACK_WIDTH,
				height: TRACK_HEIGHT,
				borderRadius: TRACK_HEIGHT / 2,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: colors.surface,
				overflow: 'hidden',
			}}
		>
			<Animated.View
				pointerEvents="none"
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: colors.primarySoft,
					opacity: nightOpacity,
				}}
			/>
			<Animated.View
				pointerEvents="none"
				style={{
					position: 'absolute',
					top: PADDING - 1,
					left: PADDING,
					width: THUMB_SIZE,
					height: THUMB_SIZE,
					borderRadius: THUMB_SIZE / 2,
					backgroundColor: colors.primary,
					alignItems: 'center',
					justifyContent: 'center',
					transform: [{ translateX }],
				}}
			>
				<Animated.View
					style={{
						position: 'absolute',
						opacity: sunOpacity,
						transform: [{ rotate: sunRotate }],
					}}
				>
					<Sun size={15} color={colors.primaryForeground} strokeWidth={2.2} />
				</Animated.View>
				<Animated.View
					style={{
						position: 'absolute',
						opacity: moonOpacity,
						transform: [{ rotate: moonRotate }],
					}}
				>
					<Moon size={15} color={colors.primaryForeground} strokeWidth={2.2} />
				</Animated.View>
			</Animated.View>
		</Pressable>
	);
}
