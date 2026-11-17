import { Text, View } from 'react-native';
import type { ProposalStatus } from '../types/proposal';
import {
	PROPOSAL_STATUS_COLORS,
	PROPOSAL_STATUS_LABELS,
} from '../utils/proposalFormat';

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
	const color = PROPOSAL_STATUS_COLORS[status];
	const background =
		status === 'approved'
			? 'bg-success-soft'
			: status === 'reproved'
				? 'bg-danger-soft'
				: 'bg-warning-soft';

	return (
		<View className={`self-start rounded-full px-2.5 py-1 ${background}`}>
			<Text style={{ color }} className="font-inter font-medium text-xs">
				{PROPOSAL_STATUS_LABELS[status]}
			</Text>
		</View>
	);
}
