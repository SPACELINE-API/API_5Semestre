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
		<View className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-lg rounded-2xl border border-white/70 bg-white/95 p-4 shadow-xl shadow-slate-900/20 sm:bottom-6 sm:p-5">
			<Text className="text-xl font-bold text-slate-900">
				Permitir cookies no site
			</Text>
			<Text className="mt-3 text-sm font-medium leading-5 text-slate-600">
				Nosso site usa cookies. Ao continuar, assumimos sua permissão para
				implantar cookies conforme detalhado nossa{' '}
				<Text className="font-bold text-blue-700 underline">
					Política de Privacidade.
				</Text>
			</Text>
			<View className="mt-5 flex-row gap-2 sm:gap-3">
				<Pressable
					className="h-11 flex-1 items-center justify-center rounded-full bg-blue-600 shadow-md shadow-blue-600/30"
					onPress={onAccept}
				>
					<Text className="text-sm font-bold text-white">Aceitar</Text>
				</Pressable>
				<Pressable
					className="h-11 flex-1 items-center justify-center rounded-full border border-slate-200 bg-white"
					onPress={onDecline}
				>
					<Text className="text-sm font-medium text-slate-600">Recusar</Text>
				</Pressable>
			</View>
		</View>
	);
}
