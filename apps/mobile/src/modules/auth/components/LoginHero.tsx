import { Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';

export function LoginHero({
	showRequestServiceButton,
}: {
	showRequestServiceButton: boolean;
}) {
	return (
		<View className="w-full flex-none justify-center py-2 md:flex-1 md:py-2">
			<View className="max-w-xl">
				<View className="mb-7 self-start rounded-full border border-[#2f86d1]/35 bg-white/70 px-4 py-1.5">
					<Text className="text-[11px] font-bold tracking-[2px] text-[#2478c2]">
						• PORTAL DO CLIENTE
					</Text>
				</View>
				<Text className="text-5xl font-extrabold leading-[1.03] tracking-[-1.5px] text-[#101b35] sm:text-6xl">
					Traduções com{`\n`}
					<Text className="text-[#2783d4]">clareza</Text>, prazo e{`\n`}
					controle.
				</Text>
				<Text className="mt-6 max-w-md text-base leading-6 text-[#506481] sm:text-lg">
					Acesse sua conta para acompanhar pedidos, ou solicite um serviço sem
					precisar se cadastrar.
				</Text>
				{showRequestServiceButton ? (
					<Link href="/solicitar-servico">
						<Pressable className="w-60 h-12 mt-5 items-center justify-center rounded-full bg-[#2d83cd] shadow-md shadow-blue-600/30 transition-transform duration-300 ease-in-out hover:-translate-y-1">
							<Text className="font-bold text-white">Solicitar serviço</Text>
						</Pressable>
					</Link>
				) : null}
			</View>
		</View>
	);
}
