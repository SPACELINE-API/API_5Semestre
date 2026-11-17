import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import type { ServiceOrderItemStatus } from '../types/serviceOrder';
import {
	WORKFLOW_STEPS,
	WORKFLOW_CURRENT_BAND_CLASS,
	getWorkflowCurrentIndex,
} from '../utils/workflowSteps';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type WorkflowPipelineProps = {
	status: ServiceOrderItemStatus;
	assignedTranslatorName?: string | null;
};

export function WorkflowPipeline({
	status,
	assignedTranslatorName,
}: WorkflowPipelineProps) {
	const themeColors = useThemeColors();
	const currentIndex = getWorkflowCurrentIndex(status);

	return (
		<View className="gap-0">
			{WORKFLOW_STEPS.map((step, index) => {
				const isCompleted = index < currentIndex;
				const isCurrent = index === currentIndex;
				const isUpcoming = index > currentIndex;
				const isLast = index === WORKFLOW_STEPS.length - 1;

				const dotClassName = isCompleted
					? 'bg-success'
					: isCurrent
						? WORKFLOW_CURRENT_BAND_CLASS[step.status]
						: 'bg-border';

				return (
					<View key={step.status} className="flex-row gap-3">
						<View className="items-center">
							<View
								accessibilityRole="text"
								accessibilityLabel={`Etapa ${step.title}${isCurrent ? ' (atual)' : ''}`}
								className={`h-6 w-6 items-center justify-center rounded-full ${dotClassName}`}
							>
								{isCompleted && (
									<Check
										size={12}
										color={themeColors.primaryForeground}
										strokeWidth={3}
									/>
								)}
							</View>

							{!isLast && (
								<View
									className={`w-0.5 flex-1 ${
										isCompleted ? 'bg-success' : 'bg-border'
									}`}
								/>
							)}
						</View>

						<View className={`flex-1 gap-0.5 ${isLast ? '' : 'pb-4'}`}>
							<Text
								className={`font-inter font-bold text-xs ${
									isUpcoming ? 'text-foreground-subtle' : 'text-foreground'
								}`}
							>
								{step.title}
							</Text>

							<Text className="font-inter text-foreground-subtle text-[12px]">
								{isCurrent
									? (assignedTranslatorName ?? 'Sem tradutor')
									: isCompleted
										? step.doneLabel
										: step.upcomingLabel}
							</Text>
						</View>
					</View>
				);
			})}
		</View>
	);
}
