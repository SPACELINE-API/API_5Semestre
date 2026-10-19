import { Text, View } from 'react-native';

export default function NotFoundRoute() {
	return (
		<View className="flex-1 items-center justify-center bg-gray-50 px-6">
			<View className="max-w-xl items-center rounded-2xl border border-gray-100 bg-white px-8 py-10 shadow-sm">
				<Text className="font-inter text-xs font-bold uppercase tracking-widest text-blue-600">
					Erro 404
				</Text>
				<Text className="mt-2 text-center font-inter text-2xl font-bold text-gray-900">
					Página não encontrada
				</Text>
				<Text className="mt-2 text-center font-inter text-sm text-gray-600">
					O endereço informado não corresponde a uma página disponível.
				</Text>
			</View>
		</View>
	);
}
