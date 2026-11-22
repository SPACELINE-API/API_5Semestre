import { View, Text } from 'react-native';
import type { SprintModule } from '../types/module';

type ModulePageProps = {
	module: SprintModule;
};

export function ModulePage({ module }: ModulePageProps) {
	return (
		<View className="flex-1 p-6 bg-surface">
			<Text className="text-xs font-poppins-bold text-primary-text uppercase tracking-wider mb-1">
				{module.eyebrow}
			</Text>
			<Text className="text-2xl font-poppins-bold text-foreground mb-2">
				{module.title}
			</Text>
			<Text className="text-base font-inter text-foreground-muted mb-6 leading-relaxed">
				{module.description}
			</Text>
			<View
				className="flex-row flex-wrap gap-2 mb-8"
				accessibilityLabel="Referências do backlog"
			>
				{module.backlogRefs.map((ref) => (
					<View key={ref} className="bg-surface-muted px-3 py-1.5 rounded-md">
						<Text className="text-xs font-inter-medium text-foreground">
							{ref}
						</Text>
					</View>
				))}
			</View>
			<View className="flex-col gap-4">
				{module.actions.map((action) => (
					<View
						key={action.label}
						className="bg-surface-subtle p-4 rounded-xl border border-border-subtle"
					>
						<Text className="text-lg font-poppins-medium text-foreground mb-1">
							{action.label}
						</Text>
						<Text className="text-sm font-inter text-foreground-muted">
							{action.description}
						</Text>
					</View>
				))}
			</View>
		</View>
	);
}
