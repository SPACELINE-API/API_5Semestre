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
			className="overflow-hidden rounded-full border border-border bg-surface shadow-sm"
			style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT }}
		>
			<Animated.View
				pointerEvents="none"
				className="absolute inset-0 bg-primary-soft"
				style={{ opacity: nightOpacity }}
			/>
			<Animated.View
				pointerEvents="none"
				className="absolute items-center justify-center rounded-full bg-primary"
				style={{
					width: THUMB_SIZE,
					height: THUMB_SIZE,
					top: PADDING - 1,
					left: PADDING,
					transform: [{ translateX }],
				}}
			>
				<Animated.View
					className="absolute"
					style={{
						opacity: sunOpacity,
						transform: [{ rotate: sunRotate }],
					}}
				>
					<Sun size={15} color={colors.primaryForeground} strokeWidth={2.2} />
				</Animated.View>
				<Animated.View
					className="absolute"
					style={{
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
