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
		<View className="gap-4 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
			<View className="flex-row flex-wrap items-start justify-between gap-3">
				<View className="min-w-0 flex-1 gap-0.5">
					<Text className="font-inter font-bold text-foreground text-sm">
						{title}
					</Text>
					{subtitle && (
						<Text className="font-inter text-foreground-muted text-xs">
							{subtitle}
						</Text>
					)}
				</View>
				{action}
			</View>
			{children}
		</View>
	);
}
