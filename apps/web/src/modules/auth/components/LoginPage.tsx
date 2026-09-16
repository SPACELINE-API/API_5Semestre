import { Text, View } from 'react-native';
import { LoginBackground } from './LoginBackground';
import { LoginBrand } from './LoginBrand';
import { LoginForm } from './LoginForm';

export function LoginPage() {
	return (
		<View className="min-h-screen flex-1 overflow-hidden">
			<LoginBackground />
			<View className="z-10 flex-1 px-6 py-6 sm:px-10 md:px-16">
				<LoginBrand />
				<View className="flex-1 items-center justify-center">
					<LoginForm />
					<Text className="mt-7 text-center text-sm text-slate-600">
						Ainda não tem acesso? <Text className="font-bold text-slate-600">Solicite seu cadastro</Text>
					</Text>
				</View>
			</View>
		</View>
	);
}
