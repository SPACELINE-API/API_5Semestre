import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

type TabBarProps<T extends string> = {
	/** `badge` opcional: número exibido ao lado do rótulo quando maior que zero. */
	tabs: { key: T; label: string; badge?: number }[];
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
			className="border-b border-border"
			contentContainerClassName="flex-row gap-7"
		>
			{tabs.map((tab) => {
				const isSelected = tab.key === activeTab;
				const hasBadge = (tab.badge ?? 0) > 0;

				return (
					<TouchableOpacity
						key={tab.key}
						onPress={() => onTabChange(tab.key)}
						activeOpacity={0.7}
						accessibilityRole="tab"
						accessibilityState={{ selected: isSelected }}
						accessibilityLabel={
							hasBadge ? `${tab.label}, ${tab.badge} pendentes` : undefined
						}
						className={`flex-row items-center gap-2 border-b-2 py-3 ${
							isSelected ? 'border-primary' : 'border-transparent'
						}`}
					>
						<Text
							className={`font-inter text-sm ${
								isSelected
									? 'font-semibold text-primary-text'
									: 'font-medium text-foreground-subtle'
							}`}
						>
							{tab.label}
						</Text>
						{hasBadge && (
							<View className="min-w-[20px] items-center rounded-full bg-danger px-1.5 py-0.5">
								<Text className="font-inter font-semibold text-[11px] text-primary-foreground">
									{tab.badge}
								</Text>
							</View>
						)}
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}
