import { Text, View } from 'react-native';
import type { ProposalStatus } from '../types/proposal';
import {
	PROPOSAL_STATUS_COLORS,
	PROPOSAL_STATUS_LABELS,
} from '../utils/proposalFormat';

const PROPOSAL_STATUS_BACKGROUNDS: Record<ProposalStatus, string> = {
	draft: 'bg-blue-50',
	pending: 'bg-amber-50',
	approved: 'bg-green-50',
	reproved: 'bg-red-50',
	cancelled: 'bg-gray-100',
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
	const color = PROPOSAL_STATUS_COLORS[status];
	const background = PROPOSAL_STATUS_BACKGROUNDS[status] ?? 'bg-amber-50';

	return (
		<View className={`self-start rounded-full px-2.5 py-1 ${background}`}>
			<Text style={{ color }} className="font-inter font-medium text-xs">
				{PROPOSAL_STATUS_LABELS[status]}
			</Text>
		</View>
	);
}
