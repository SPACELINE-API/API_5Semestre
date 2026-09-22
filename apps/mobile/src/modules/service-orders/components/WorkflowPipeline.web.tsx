import { useMemo } from 'react';
import { View } from 'react-native';
import {
	ReactFlow,
	Background,
	BackgroundVariant,
	Handle,
	Position,
	MarkerType,
	type Node,
	type Edge,
	type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ServiceOrderItemStatus } from '../types/serviceOrder';
import { WorkflowStageCard } from './WorkflowStageCard';
import {
	WORKFLOW_STEPS,
	getWorkflowCurrentIndex,
} from '../utils/workflowSteps';

type StageNodeData = {
	stepIndex: number;
	isCurrent: boolean;
	isCompleted: boolean;
	isUpcoming: boolean;
	assignedTranslatorName?: string | null;
};

function StageNode({ data }: NodeProps) {
	const nodeData = data as unknown as StageNodeData;
	const step = WORKFLOW_STEPS[nodeData.stepIndex];

	return (
		<>
			<Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
			<WorkflowStageCard
				step={step}
				stepIndex={nodeData.stepIndex}
				isCurrent={nodeData.isCurrent}
				isCompleted={nodeData.isCompleted}
				isUpcoming={nodeData.isUpcoming}
				assignedTranslatorName={nodeData.assignedTranslatorName}
			/>
			<Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
		</>
	);
}

const NODE_TYPES = { stage: StageNode };

const NODE_WIDTH = 144;
const NODE_GAP = 56;

type WorkflowPipelineProps = {
	status: ServiceOrderItemStatus;
	assignedTranslatorName?: string | null;
};

export function WorkflowPipeline({
	status,
	assignedTranslatorName,
}: WorkflowPipelineProps) {
	const currentIndex = getWorkflowCurrentIndex(status);

	const nodes: Node[] = useMemo(
		() =>
			WORKFLOW_STEPS.map((step, index) => ({
				id: step.status,
				type: 'stage',
				position: { x: index * (NODE_WIDTH + NODE_GAP), y: 0 },
				data: {
					stepIndex: index,
					isCurrent: index === currentIndex,
					isCompleted: index < currentIndex,
					isUpcoming: index > currentIndex,
					assignedTranslatorName,
				},
				draggable: false,
				selectable: false,
			})),
		[currentIndex, assignedTranslatorName],
	);

	const edges: Edge[] = useMemo(
		() =>
			WORKFLOW_STEPS.slice(0, -1).map((step, index) => {
				const isPassed = index < currentIndex;
				const color = isPassed ? '#15803D' : '#D1D5DB';

				return {
					id: `${step.status}-${WORKFLOW_STEPS[index + 1].status}`,
					source: step.status,
					target: WORKFLOW_STEPS[index + 1].status,
					style: { stroke: color, strokeWidth: 2 },
					markerEnd: { type: MarkerType.ArrowClosed, color },
				};
			}),
		[currentIndex],
	);

	const contentWidth =
		WORKFLOW_STEPS.length * NODE_WIDTH + (WORKFLOW_STEPS.length - 1) * NODE_GAP;

	return (
		<View style={{ width: contentWidth + 40, height: 170 }}>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={NODE_TYPES}
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={false}
				panOnDrag={false}
				zoomOnScroll={false}
				zoomOnPinch={false}
				zoomOnDoubleClick={false}
				preventScrolling={false}
				defaultViewport={{ x: 20, y: 30, zoom: 1 }}
				proOptions={{ hideAttribution: true }}
			>
				<Background
					variant={BackgroundVariant.Dots}
					gap={16}
					size={1}
					color="#F3F4F6"
				/>
			</ReactFlow>
		</View>
	);
}
