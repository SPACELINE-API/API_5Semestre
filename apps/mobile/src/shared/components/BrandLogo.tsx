import { Image } from 'react-native';
import logoAlianca from '../assets/logo-alianca.png';

type BrandLogoProps = {
	width?: number;
	height?: number;
};

export function BrandLogo({ width = 170, height = 44 }: BrandLogoProps) {
	return (
		<Image
			source={logoAlianca}
			style={{ width, height }}
			resizeMode="contain"
			accessibilityLabel="Aliança Traduções"
		/>
	);
}
