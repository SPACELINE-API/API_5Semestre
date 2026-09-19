import { View, Text } from 'react-native';

type StatusBadgeProps = {
	isActive: boolean;
};

export function StatusBadge({ isActive }: StatusBadgeProps) {
	return (
		<View
			className={`self-start rounded-lg px-2.5 py-1 ${isActive ? 'bg-green-50' : 'bg-red-50'}`}
		>
			<Text
				className={`font-inter font-semibold text-xs ${isActive ? 'text-green-900' : 'text-red-900'}`}
			>
				{isActive ? 'Ativo' : 'Inativo'}
			</Text>
		</View>
	);
}
