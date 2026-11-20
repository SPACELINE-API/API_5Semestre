import { Image, View } from 'react-native';
import logoAlianca from '../assets/logo-alianca.png';
import { useTheme } from '../theme/ThemeProvider';

type BrandLogoProps = {
	width?: number;
	height?: number;
};

export function BrandLogo({ width = 170, height = 44 }: BrandLogoProps) {
	const { isDark } = useTheme();

	return (
		<View
			style={
				isDark
					? {
							backgroundColor: 'rgba(255, 255, 255, 0.94)',
							borderRadius: 14,
							paddingHorizontal: 12,
							paddingVertical: 6,
						}
					: undefined
			}
		>
			<Image
				source={logoAlianca}
				style={{ width, height }}
				resizeMode="contain"
				accessibilityLabel="Aliança Traduções"
			/>
		</View>
	);
}
