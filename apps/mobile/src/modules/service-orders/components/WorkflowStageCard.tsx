import { View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import type { WorkflowStep } from '../utils/workflowSteps';
import { WORKFLOW_CURRENT_BAND_CLASS } from '../utils/workflowSteps';

type WorkflowStageCardProps = {
	step: WorkflowStep;
	stepIndex: number;
	isCurrent: boolean;
	isCompleted: boolean;
	isUpcoming: boolean;
	assignedTranslatorName?: string | null;
};

export function WorkflowStageCard({
	step,
	stepIndex,
	isCurrent,
	isCompleted,
	isUpcoming,
	assignedTranslatorName,
}: WorkflowStageCardProps) {
	return (
		<View
			accessibilityRole="text"
			accessibilityLabel={`Etapa ${step.title}${isCurrent ? ' (atual)' : ''}`}
			className={`w-[144px] overflow-hidden rounded-lg border bg-white ${
				isCurrent ? 'border-blue-400 shadow-sm' : 'border-gray-200'
			}`}
		>
			<View className="gap-1 px-3 pb-2.5 pt-2">
				<View className="flex-row items-center justify-between">
					<Text className="font-inter font-bold text-gray-400 text-[10px]">
						ETAPA {stepIndex + 1}
					</Text>

					{isCompleted && (
						<View className="h-4 w-4 items-center justify-center rounded-full bg-green-600">
							<Check size={10} color="#FFFFFF" strokeWidth={3} />
						</View>
					)}
				</View>

				<Text
					className={`font-inter font-bold text-xs ${
						isUpcoming ? 'text-gray-400' : 'text-gray-900'
					}`}
					numberOfLines={1}
				>
					{step.title}
				</Text>

				<Text
					className="font-inter text-gray-400 text-[10px]"
					numberOfLines={1}
				>
					{assignedTranslatorName ?? 'Sem tradutor'}
				</Text>
			</View>

			<View
				className={`items-center py-1.5 ${
					isCurrent
						? WORKFLOW_CURRENT_BAND_CLASS[step.status]
						: isCompleted
							? 'bg-green-600'
							: 'bg-gray-100'
				}`}
			>
				<Text
					className={`font-inter font-bold text-[10px] uppercase tracking-wide ${
						isUpcoming ? 'text-gray-500' : 'text-white'
					}`}
				>
					{isCompleted
						? step.doneLabel
						: isCurrent
							? step.title
							: step.upcomingLabel}
				</Text>
			</View>
		</View>
	);
}
