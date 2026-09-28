import { View, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ServiceOrderItemStatus } from '../types/serviceOrder';
import { WorkflowStageCard } from './WorkflowStageCard';
import {
	WORKFLOW_STEPS,
	getWorkflowCurrentIndex,
} from '../utils/workflowSteps';

function EndpointLabel({ label }: { label: string }) {
	return (
		<Text className="font-inter font-semibold text-gray-400 text-[11px] uppercase tracking-wide">
			{label}
		</Text>
	);
}

type WorkflowPipelineProps = {
	status: ServiceOrderItemStatus;
	assignedTranslatorName?: string | null;
};

export function WorkflowPipeline({
	status,
	assignedTranslatorName,
}: WorkflowPipelineProps) {
	const currentIndex = getWorkflowCurrentIndex(status);

	return (
		<View className="flex-row items-center">
			<EndpointLabel label="Início" />
			<View className="h-px w-4 bg-gray-300" />

			{WORKFLOW_STEPS.map((step, index) => {
				const isCurrent = index === currentIndex;
				const isCompleted = index < currentIndex;
				const isUpcoming = index > currentIndex;

				return (
					<View key={step.status} className="flex-row items-center">
						<WorkflowStageCard
							step={step}
							stepIndex={index}
							isCurrent={isCurrent}
							isCompleted={isCompleted}
							isUpcoming={isUpcoming}
							assignedTranslatorName={assignedTranslatorName}
						/>

						{index < WORKFLOW_STEPS.length - 1 ? (
							<ChevronRight
								size={16}
								color={index < currentIndex ? '#15803D' : '#D1D5DB'}
							/>
						) : (
							<View className="h-px w-4 bg-gray-300" />
						)}
					</View>
				);
			})}

			<EndpointLabel label="Fim" />
		</View>
	);
}
