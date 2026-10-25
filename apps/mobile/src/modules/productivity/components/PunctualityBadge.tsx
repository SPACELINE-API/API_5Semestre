import { Text, View } from 'react-native';

type PunctualityBadgeProps = { onTime: boolean | null };

export function PunctualityBadge({ onTime }: PunctualityBadgeProps) {
	if (onTime === null) {
		return (
			<View className="self-start rounded-full bg-gray-100 px-2.5 py-0.5">
				<Text className="font-inter font-medium text-gray-600 text-xs">
					Sem prazo
				</Text>
			</View>
		);
	}

	return (
		<View
			className={`self-start rounded-full px-2.5 py-0.5 ${onTime ? 'bg-green-50' : 'bg-red-50'}`}
		>
			<Text
				className={`font-inter font-medium text-xs ${onTime ? 'text-green-900' : 'text-red-900'}`}
			>
				{onTime ? 'No prazo' : 'Atrasado'}
			</Text>
		</View>
	);
}
