import FormsRequest from '../components/FormsRequest';

import { ScrollView, Text, View } from 'react-native';

import { DecorativeBackground } from '../../auth/components/DecorativeBackground';

export default function NewRequestPage() {
	return (
		<View className="min-h-screen flex-1 overflow-hidden bg-primary-soft">
			<DecorativeBackground />
			<ScrollView
				className="z-10 flex-1"
				contentContainerClassName="items-center px-6 py-10 md:px-[7.5%] md:py-12"
			>
				<View className="w-full max-w-3xl items-center">
					<View className="mb-5 self-center rounded-full border border-primary/35 bg-surface/70 px-4 py-1.5">
						<Text className="text-[11px] font-bold tracking-[2px] text-primary-text">
							• NOVA SOLICITAÇÃO
						</Text>
					</View>
					<Text className="text-center text-4xl font-extrabold leading-[1.05] tracking-[-1px] text-foreground sm:text-5xl">
						Traduza seus documentos com{'\n'}
						<Text className="text-primary-text">clareza</Text> e precisão.
					</Text>
					<Text className="mt-4 max-w-xl text-center text-base leading-6 text-foreground-muted sm:text-lg">
						Preencha os dados abaixo e nossa equipe cuidará do restante da sua
						tradução.
					</Text>
				</View>

				<View className="mb-10 mt-10 w-full max-w-3xl">
					<FormsRequest />
				</View>
			</ScrollView>
		</View>
	);
}
