import { ScrollView, Text, TouchableOpacity } from 'react-native';

type TabBarProps<T extends string> = {
	tabs: { key: T; label: string }[];
	activeTab: T;
	onTabChange: (tab: T) => void;
};

export function TabBar<T extends string>({
	tabs,
	activeTab,
	onTabChange,
}: TabBarProps<T>) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="border-b border-gray-200"
			contentContainerClassName="flex-row gap-7"
		>
			{tabs.map((tab) => {
				const isSelected = tab.key === activeTab;

				return (
					<TouchableOpacity
						key={tab.key}
						onPress={() => onTabChange(tab.key)}
						activeOpacity={0.7}
						accessibilityRole="tab"
						accessibilityState={{ selected: isSelected }}
						className={`border-b-2 py-3 ${
							isSelected ? 'border-blue-600' : 'border-transparent'
						}`}
					>
						<Text
							className={`font-inter text-sm ${
								isSelected
									? 'font-semibold text-blue-600'
									: 'font-medium text-gray-400'
							}`}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}
