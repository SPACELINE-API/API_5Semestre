import { View } from 'react-native';

export function DecorativeBackground() {
	return (
		<View className="absolute inset-0 overflow-hidden bg-[#dceeff]">
			<View className="absolute -left-[14%] top-[10%] h-[42%] w-[78%] rounded-[50%] bg-[#f8fbff] opacity-95" />
			<View className="absolute -right-[18%] top-[6%] h-[43%] w-[78%] rounded-[50%] bg-[#f8fbff] opacity-90" />
			<View className="absolute -left-[16%] top-[49%] h-[40%] w-[78%] rounded-[50%] bg-[#f8fbff] opacity-90" />
			<View className="absolute -right-[16%] top-[45%] h-[40%] w-[76%] rounded-[50%] bg-[#f8fbff] opacity-95" />
			<View className="absolute -bottom-[18%] -left-[12%] h-[38%] w-[110%] rounded-[50%] bg-[#2f7fd1]" />
			<View className="absolute -bottom-[5%] -left-[8%] h-[22%] w-[100%] rounded-[50%] bg-[#438fdc] opacity-80" />
			<View className="absolute -left-20 top-[35%] h-52 w-52 rounded-full bg-[#b8dafa] opacity-70" />
			<View className="absolute right-[-5%] top-[48%] h-64 w-64 rounded-full bg-[#c2e1fa] opacity-60" />
		</View>
	);
}
