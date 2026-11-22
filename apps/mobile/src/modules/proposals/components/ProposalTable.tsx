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

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
const WIDE_BREAKPOINT = 900;

type ProposalTableProps = {
	rows: Proposal[];
	onSelect: (proposal: Proposal) => void;
};

export function ProposalTable({ rows, onSelect }: ProposalTableProps) {
	const themeColors = useThemeColors();
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
							className="gap-3 rounded-xl border border-border p-4"
						>
							<View className="flex-row items-center justify-between gap-2">
								<View className="min-w-0 flex-1 gap-0.5">
									<Text
										className="font-inter font-semibold text-foreground text-sm"
										numberOfLines={1}
									>
										{customer}
									</Text>
									<Text
										className="font-inter text-foreground-muted text-xs"
										numberOfLines={1}
									>
										{proposal.translation_service?.trim() ||
											'Serviço não informado'}
									</Text>
								</View>
								<ChevronRight size={17} color={themeColors.foregroundSubtle} />
							</View>
							<View className="flex-row flex-wrap items-center justify-between gap-3">
								<View className="gap-0.5">
									<Text className="font-inter text-foreground-subtle text-xs">
										Valor
									</Text>
									<Text className="font-inter font-medium text-foreground text-sm">
										{formatProposalValue(proposal.total_value)}
									</Text>
								</View>
								<ProposalStatusBadge status={proposal.status} />
								<View className="gap-0.5">
									<Text className="font-inter text-foreground-subtle text-xs">
										Criada em
									</Text>
									<Text className="font-inter text-foreground-secondary text-sm">
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
		<View className="overflow-hidden rounded-xl border border-border">
			<View className="flex-row items-center border-b border-border bg-surface-subtle px-4 py-3">
				<Text className="flex-[1.2] font-inter font-semibold text-foreground-muted text-xs uppercase">
					Cliente
				</Text>
				<Text className="flex-1 font-inter font-semibold text-foreground-muted text-xs uppercase">
					Serviço de tradução
				</Text>
				<Text className="w-32 font-inter font-semibold text-foreground-muted text-xs uppercase">
					Valor total
				</Text>
				<Text className="w-28 font-inter font-semibold text-foreground-muted text-xs uppercase">
					Status
				</Text>
				<Text className="w-28 font-inter font-semibold text-foreground-muted text-xs uppercase">
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
						className="flex-row items-center border-b border-border-subtle px-4 py-3.5 last:border-b-0"
					>
						<Text
							className="flex-[1.2] pr-3 font-inter font-semibold text-foreground text-sm"
							numberOfLines={1}
						>
							{customer}
						</Text>
						<Text
							className="flex-1 pr-3 font-inter text-foreground-secondary text-sm"
							numberOfLines={1}
						>
							{proposal.translation_service?.trim() || 'Serviço não informado'}
						</Text>
						<Text
							className="w-32 font-inter text-foreground-secondary text-sm"
							numberOfLines={1}
						>
							{formatProposalValue(proposal.total_value)}
						</Text>
						<View className="w-28">
							<ProposalStatusBadge status={proposal.status} />
						</View>
						<Text className="w-28 font-inter text-foreground-secondary text-sm">
							{formatProposalDate(proposal.created_at)}
						</Text>
						<View className="w-6 items-end">
							<ChevronRight size={17} color={themeColors.foregroundSubtle} />
						</View>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
