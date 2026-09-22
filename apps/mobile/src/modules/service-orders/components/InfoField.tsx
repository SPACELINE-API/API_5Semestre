import { View, Text } from 'react-native';

type InfoFieldProps = {
	label: string;
	value?: string | null;
};

export function InfoField({ label, value }: InfoFieldProps) {
	return (
		<View className="min-w-[180px] flex-1 gap-1">
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>

			<Text
				className="font-inter font-medium text-gray-800 text-sm"
				numberOfLines={2}
			>
				{value || 'Não informado'}
			</Text>
		</View>
	);
}
