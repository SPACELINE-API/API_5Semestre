import { View, Text } from 'react-native';

type StatusBadgeProps = {
	isActive: boolean;
};

export function StatusBadge({ isActive }: StatusBadgeProps) {
	return (
		<View
			className={`self-start rounded-lg px-2.5 py-1 ${isActive ? 'bg-success-soft' : 'bg-danger-soft'}`}
		>
			<Text
				className={`font-inter font-semibold text-xs ${isActive ? 'text-success-text' : 'text-danger-text'}`}
			>
				{isActive ? 'Ativo' : 'Inativo'}
			</Text>
		</View>
	);
}
