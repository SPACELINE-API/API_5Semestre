import { Text, View } from 'react-native';

export default function NotFoundRoute() {
	return (
		<View className="flex-1 items-center justify-center bg-surface-subtle px-6">
			<View className="max-w-xl items-center rounded-2xl border border-border-subtle bg-surface px-8 py-10 shadow-sm">
				<Text className="font-inter text-xs font-bold uppercase tracking-widest text-primary-text">
					Erro 404
				</Text>
				<Text className="mt-2 text-center font-inter text-2xl font-bold text-foreground">
					Página não encontrada
				</Text>
				<Text className="mt-2 text-center font-inter text-sm text-foreground-secondary">
					O endereço informado não corresponde a uma página disponível.
				</Text>
			</View>
		</View>
	);
}
