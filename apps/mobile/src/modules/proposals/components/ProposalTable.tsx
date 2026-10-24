import {
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Proposal } from '../types/proposal';
import {
	formatProposalDate,
	formatProposalValue,
	proposalCustomerLabel,
} from '../utils/proposalFormat';
import { ProposalStatusBadge } from './ProposalStatusBadge';

const WIDE_BREAKPOINT = 900;

type ProposalTableProps = {
	rows: Proposal[];
	onSelect: (proposal: Proposal) => void;
};

export function ProposalTable({ rows, onSelect }: ProposalTableProps) {
	const { width } = useWindowDimensions();
	const isWide = width >= WIDE_BREAKPOINT;

	if (!isWide) {
		return (
			<View className="gap-3">
				{rows.map((proposal) => {
					const customer = proposalCustomerLabel(proposal);
					return (
						<TouchableOpacity
							key={proposal.id}
							onPress={() => onSelect(proposal)}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={`Ver detalhes da proposta de ${customer}`}
							className="gap-3 rounded-xl border border-gray-200 p-4"
						>
							<View className="flex-row items-center justify-between gap-2">
								<View className="min-w-0 flex-1 gap-0.5">
									<Text
										className="font-inter font-semibold text-gray-900 text-sm"
										numberOfLines={1}
									>
										{customer}
									</Text>
									<Text
										className="font-inter text-gray-500 text-xs"
										numberOfLines={1}
									>
										{proposal.translation_service?.trim() ||
											'Serviço não informado'}
									</Text>
								</View>
								<ChevronRight size={17} color="#9CA3AF" />
							</View>
							<View className="flex-row flex-wrap items-center justify-between gap-3">
								<View className="gap-0.5">
									<Text className="font-inter text-gray-400 text-xs">
										Valor
									</Text>
									<Text className="font-inter font-medium text-gray-800 text-sm">
										{formatProposalValue(proposal.total_value)}
									</Text>
								</View>
								<ProposalStatusBadge status={proposal.status} />
								<View className="gap-0.5">
									<Text className="font-inter text-gray-400 text-xs">
										Criada em
									</Text>
									<Text className="font-inter text-gray-700 text-sm">
										{formatProposalDate(proposal.created_at)}
									</Text>
								</View>
							</View>
						</TouchableOpacity>
					);
				})}
			</View>
		);
	}

	return (
		<View className="overflow-hidden rounded-xl border border-gray-200">
			<View className="flex-row items-center border-b border-gray-200 bg-gray-50 px-4 py-3">
				<Text className="flex-[1.2] font-inter font-semibold text-gray-500 text-xs uppercase">
					Cliente
				</Text>
				<Text className="flex-1 font-inter font-semibold text-gray-500 text-xs uppercase">
					Serviço de tradução
				</Text>
				<Text className="w-32 font-inter font-semibold text-gray-500 text-xs uppercase">
					Valor total
				</Text>
				<Text className="w-28 font-inter font-semibold text-gray-500 text-xs uppercase">
					Status
				</Text>
				<Text className="w-28 font-inter font-semibold text-gray-500 text-xs uppercase">
					Criada em
				</Text>
				<View className="w-6" />
			</View>
			{rows.map((proposal) => {
				const customer = proposalCustomerLabel(proposal);
				return (
					<TouchableOpacity
						key={proposal.id}
						onPress={() => onSelect(proposal)}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Ver detalhes da proposta de ${customer}`}
						className="flex-row items-center border-b border-gray-100 px-4 py-3.5 last:border-b-0"
					>
						<Text
							className="flex-[1.2] pr-3 font-inter font-semibold text-gray-900 text-sm"
							numberOfLines={1}
						>
							{customer}
						</Text>
						<Text
							className="flex-1 pr-3 font-inter text-gray-700 text-sm"
							numberOfLines={1}
						>
							{proposal.translation_service?.trim() || 'Serviço não informado'}
						</Text>
						<Text
							className="w-32 font-inter text-gray-700 text-sm"
							numberOfLines={1}
						>
							{formatProposalValue(proposal.total_value)}
						</Text>
						<View className="w-28">
							<ProposalStatusBadge status={proposal.status} />
						</View>
						<Text className="w-28 font-inter text-gray-700 text-sm">
							{formatProposalDate(proposal.created_at)}
						</Text>
						<View className="w-6 items-end">
							<ChevronRight size={17} color="#9CA3AF" />
						</View>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
