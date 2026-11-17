import { View, Text, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export type StatusFilter = 'all' | 'active' | 'inactive';

type CompanyFiltersProps = {
	statusFilter: StatusFilter;
	onStatusFilterChange: (value: StatusFilter) => void;
};

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'active', label: 'Ativo' },
	{ value: 'inactive', label: 'Inativo' },
];

export function CompanyFilters({
	statusFilter,
	onStatusFilterChange,
}: CompanyFiltersProps) {
	const themeColors = useThemeColors();
	return (
		<View className="gap-1">
			<Text className="mb-2 font-inter font-semibold text-foreground-subtle text-xs uppercase tracking-wide">
				Status
			</Text>
			{STATUS_OPTIONS.map((option) => {
				const isSelected = statusFilter === option.value;

				return (
					<TouchableOpacity
						key={option.value}
						onPress={() => onStatusFilterChange(option.value)}
						activeOpacity={0.7}
						className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
							isSelected ? 'bg-primary-soft' : ''
						}`}
					>
						<Text
							className={`font-inter text-sm ${
								isSelected
									? 'font-semibold text-primary-strong'
									: 'text-foreground-secondary'
							}`}
						>
							{option.label}
						</Text>
						{isSelected && <Check size={16} color={themeColors.primary} />}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
