import { Text, View } from 'react-native';
import { AppModal } from '../../../shared/components/AppModal';
import type { Proposal } from '../types/proposal';
import {
	formatProposalDate,
	formatProposalValue,
	proposalCustomerLabel,
} from '../utils/proposalFormat';
import { ProposalStatusBadge } from './ProposalStatusBadge';

function DetailField({ label, value }: { label: string; value: string }) {
	return (
		<View className="gap-1 border-b border-gray-100 py-3 last:border-b-0">
			<Text className="font-inter font-medium text-gray-400 text-xs uppercase tracking-wide">
				{label}
			</Text>
			<Text className="font-inter text-gray-800 text-sm">{value}</Text>
		</View>
	);
}

export function ProposalDetailModal({
	proposal,
	onClose,
}: {
	proposal: Proposal | null;
	onClose: () => void;
}) {
	return (
		<AppModal
			visible={Boolean(proposal)}
			title="Detalhes da proposta"
			closeLabel="Fechar"
		size="md"
		onClose={onClose}
		>
			{proposal && (
				<View className="px-5 pb-5 md:px-7">
					<DetailField label="Cliente" value={proposalCustomerLabel(proposal)} />
					<DetailField
						label="Empresa"
						value={proposal.enterprise?.trim() || 'Não informada'}
					/>
					<DetailField
						label="Serviço de tradução"
						value={proposal.translation_service || 'Não informado'}
					/>
					<DetailField
						label="Valor total"
						value={formatProposalValue(proposal.total_value)}
					/>
					<View className="gap-1 border-b border-gray-100 py-3">
						<Text className="font-inter font-medium text-gray-400 text-xs uppercase tracking-wide">
							Situação
						</Text>
						<ProposalStatusBadge status={proposal.status} />
					</View>
					<DetailField
						label="Criada em"
						value={formatProposalDate(proposal.created_at)}
					/>
				</View>
			)}
		</AppModal>
	);
}
