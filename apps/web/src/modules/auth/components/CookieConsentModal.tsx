import { Pressable, Text, View } from 'react-native';

type CookieConsentModalProps = {
	onAccept: () => void;
	onDecline: () => void;
};

export function CookieConsentModal({
	onAccept,
	onDecline,
}: CookieConsentModalProps) {
	return (
		<View className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-xl rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-900/20 sm:bottom-8 sm:p-7">
			<Text className="text-2xl font-bold text-slate-900">
				Permitir cookies no site
			</Text>
			<Text className="mt-4 text-base font-medium leading-6 text-slate-600">
				Nosso site usa cookies. Ao continuar, assumimos sua permissão para
				implantar cookies conforme detalhado nossa{' '}
				<Text className="font-bold text-blue-700 underline">
					Política de Privacidade.
				</Text>
			</Text>
			<View className="mt-7 flex-row gap-3 sm:gap-4">
				<Pressable
					className="h-14 flex-1 items-center justify-center rounded-full bg-blue-600 shadow-md shadow-blue-600/30"
					onPress={onAccept}
				>
					<Text className="text-base font-bold text-white">Aceitar</Text>
				</Pressable>
				<Pressable
					className="h-14 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white"
					onPress={onDecline}
				>
					<Text className="text-base font-medium text-slate-600">Recusar</Text>
				</Pressable>
			</View>
		</View>
	);
}
