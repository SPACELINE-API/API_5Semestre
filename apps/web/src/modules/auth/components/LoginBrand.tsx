import { Image, Text, View } from 'react-native';
import logo from '../../../shared/assets/logo-alianca-simbolo.png';

export function LoginBrand() {
	return (
		<View className="flex-row items-center gap-4">
			<Image source={logo} className="h-16 w-16" resizeMode="contain" />
			<Text className="text-xl font-bold text-white sm:text-2xl">Aliança Traduções</Text>
		</View>
	);
}
