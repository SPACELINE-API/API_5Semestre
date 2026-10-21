import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type ChartCardProps = {
	title: string;
	subtitle?: string;
	action?: ReactNode;
	children: ReactNode;
};

export function ChartCard({
	title,
	subtitle,
	action,
	children,
}: ChartCardProps) {
	return (
		<View className="gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-5">
			<View className="flex-row flex-wrap items-start justify-between gap-3">
				<View className="min-w-0 flex-1 gap-0.5">
					<Text className="font-inter font-bold text-gray-900 text-sm">
						{title}
					</Text>
					{subtitle && (
						<Text className="font-inter text-gray-500 text-xs">{subtitle}</Text>
					)}
				</View>
				{action}
			</View>
			{children}
		</View>
	);
}
