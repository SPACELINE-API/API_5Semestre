import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type GradientButtonProps = {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	className?: string;
};

export function GradientButton({
	label,
	onPress,
	disabled = false,
	className = '',
}: GradientButtonProps) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			className={`h-12 overflow-hidden rounded-full shadow-md shadow-blue-600/30 ${disabled ? 'opacity-70' : ''} ${className}`}
		>
			<View pointerEvents="none" style={StyleSheet.absoluteFill}>
				<Svg
					width="100%"
					height="100%"
					viewBox="0 0 100 1"
					preserveAspectRatio="none"
				>
					<Defs>
						<LinearGradient id="gradientButton" x1="0" y1="0" x2="1" y2="0">
							<Stop offset="0" stopColor="#2f8bd8" />
							<Stop offset="1" stopColor="#1a4fb0" />
						</LinearGradient>
					</Defs>
					<Rect width="100" height="1" fill="url(#gradientButton)" />
				</Svg>
			</View>
			<View className="h-full items-center justify-center">
				<Text className="font-bold text-white tracking-wide">{label}</Text>
			</View>
		</Pressable>
	);
}
