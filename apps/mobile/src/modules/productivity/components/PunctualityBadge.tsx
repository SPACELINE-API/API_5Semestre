import { Text, View } from 'react-native';

type PunctualityBadgeProps = { onTime: boolean | null };

export function PunctualityBadge({ onTime }: PunctualityBadgeProps) {
	if (onTime === null) {
		return (
			<View className="self-start rounded-full bg-surface-muted px-2.5 py-0.5">
				<Text className="font-inter font-medium text-foreground-secondary text-xs">
					Sem prazo
				</Text>
			</View>
		);
	}

	return (
		<View
			className={`self-start rounded-full px-2.5 py-0.5 ${onTime ? 'bg-success-soft' : 'bg-danger-soft'}`}
		>
			<Text
				className={`font-inter font-medium text-xs ${onTime ? 'text-success-text' : 'text-danger-text'}`}
			>
				{onTime ? 'No prazo' : 'Atrasado'}
			</Text>
		</View>
	);
}
