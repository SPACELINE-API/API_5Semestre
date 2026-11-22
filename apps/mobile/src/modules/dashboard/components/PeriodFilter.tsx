import { Pressable, Text, View } from 'react-native';
import { PERIOD_OPTIONS } from '../services/dashboardMetrics';
import type { PeriodKey } from '../types/overview';

type PeriodFilterProps = {
	value: PeriodKey;
	onChange: (period: PeriodKey) => void;
};

/** Controle segmentado de período. */
export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
	return (
		<View
			accessibilityRole="tablist"
			className="flex-row self-start rounded-xl bg-surface-muted p-1"
		>
			{PERIOD_OPTIONS.map((option) => {
				const selected = option.key === value;
				return (
					<Pressable
						key={option.key}
						accessibilityRole="tab"
						accessibilityState={{ selected }}
						accessibilityLabel={`Período: ${option.label}`}
						onPress={() => onChange(option.key)}
						className={`rounded-lg px-3 py-1.5 transition-colors md:px-4 ${
							selected ? 'bg-surface' : 'hover:bg-border/60'
						}`}
					>
						<Text
							className={`text-xs md:text-sm ${
								selected
									? 'font-inter-semibold text-foreground'
									: 'font-inter-medium text-foreground-muted'
							}`}
						>
							{option.label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
