import { View } from 'react-native';

export function LoginBackground() {
	return (
		<View className="absolute inset-0 overflow-hidden bg-sky-400">
			<View className="absolute -left-24 bottom-8 h-96 w-96 rounded-full bg-blue-500/45" />
			<View className="absolute left-[45%] top-[-5%] h-48 w-48 rounded-full bg-blue-500/45" />
			<View
				className="absolute right-[-4%] top-0 h-[72%] w-[48%] opacity-60"
				style={{
					backgroundImage: 'radial-gradient(#d7efff 1.5px, transparent 1.5px)',
					backgroundSize: '24px 24px',
				}}
			/>
			<View
				className="absolute bottom-[-3%] left-0 h-[42%] w-[30%] opacity-65"
				style={{
					backgroundImage: 'radial-gradient(#d7efff 1.5px, transparent 1.5px)',
					backgroundSize: '24px 24px',
				}}
			/>
			<View
				className="absolute bottom-0 right-[8%] h-[34%] w-[38%] opacity-50"
				style={{
					backgroundImage: 'radial-gradient(#d7efff 1.5px, transparent 1.5px)',
					backgroundSize: '24px 24px',
				}}
			/>
		</View>
	);
}
