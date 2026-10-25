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
			className="flex-row self-start rounded-xl bg-gray-100 p-1"
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
							selected ? 'bg-white' : 'hover:bg-gray-200/60'
						}`}
					>
						<Text
							className={`text-xs md:text-sm ${
								selected
									? 'font-inter-semibold text-gray-900'
									: 'font-inter-medium text-gray-500'
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
