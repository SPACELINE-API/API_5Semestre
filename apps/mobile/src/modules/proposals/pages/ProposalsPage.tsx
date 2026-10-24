import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ProposalCharts } from '../components/ProposalCharts';
import { ProposalDetailModal } from '../components/ProposalDetailModal';
import { ProposalFilters } from '../components/ProposalFilters';
import {
	ProposalEmpty,
	ProposalError,
	ProposalLoading,
} from '../components/ProposalStates';
import { ProposalTable } from '../components/ProposalTable';
import { useProposals } from '../hooks/useProposals';
import type { Proposal, ProposalFilters as Filters } from '../types/proposal';
import {
	listProposalCompanies,
	PROPOSAL_PAGE_SIZE,
} from '../services/proposalService';

const INITIAL_FILTERS: Filters = {
	startDate: '',
	endDate: '',
	status: 'all',
	enterprise: '',
	orderBy: 'created_at',
	orderDir: 'desc',
	page: 1,
};

function ProposalPagination({
	page,
	total,
	loading,
	onPageChange,
}: {
	page: number;
	total: number;
	loading: boolean;
	onPageChange: (page: number) => void;
}) {
	const totalPages = Math.ceil(total / PROPOSAL_PAGE_SIZE);
	const firstItem = total ? (page - 1) * PROPOSAL_PAGE_SIZE + 1 : 0;
	const lastItem = Math.min(page * PROPOSAL_PAGE_SIZE, total);

	return (
		<View className="mb-5 flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:justify-between">
			<Text className="font-inter text-gray-600 text-sm">
				Exibindo {firstItem}–{lastItem} de {total} propostas · página {page} de{' '}
				{Math.max(totalPages, 1)}
			</Text>
			<View className="w-full flex-row items-center justify-between gap-3 md:w-auto md:justify-start">
				<TouchableOpacity
					accessibilityRole="button"
					disabled={page <= 1 || loading}
					onPress={() => onPageChange(Math.max(1, page - 1))}
					className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg px-3 py-2 md:flex-none ${page <= 1 || loading ? 'opacity-40' : 'hover:bg-gray-100'}`}
				>
					<ChevronLeft size={17} color="#374151" />
					<Text className="font-inter font-medium text-gray-700 text-sm">
						Anterior
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					accessibilityRole="button"
					disabled={page >= totalPages || loading}
					onPress={() => onPageChange(Math.min(totalPages, page + 1))}
					className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg px-3 py-2 md:flex-none ${page >= totalPages || loading ? 'opacity-40' : 'hover:bg-gray-100'}`}
				>
					<Text className="font-inter font-medium text-gray-700 text-sm">
						Próxima
					</Text>
					<ChevronRight size={17} color="#374151" />
				</TouchableOpacity>
			</View>
		</View>
	);
}

export function ProposalsPage() {
	const router = useRouter();
	const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
	const [companies, setCompanies] = useState<string[]>([]);
	const [companiesError, setCompaniesError] = useState<string | null>(null);
	const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
		null,
	);
	const { result, isLoading, error, refresh } = useProposals(filters);
	const hasFocusedBefore = useRef(false);
	const refreshProposals = useRef(refresh);
	const proposals = result?.items ?? [];
	const total = result?.total ?? 0;
	const hasFilters = Boolean(
		filters.startDate ||
		filters.endDate ||
		filters.status !== 'all' ||
		filters.enterprise,
	);

	const loadCompanies = useCallback(async () => {
		try {
			const data = await listProposalCompanies();
			setCompanies(data);
			setCompaniesError(null);
		} catch {
			setCompaniesError('Não foi possível carregar as empresas.');
		}
	}, []);
	useEffect(() => {
		refreshProposals.current = refresh;
	}, [refresh]);

	useFocusEffect(
		useCallback(() => {
			void loadCompanies();
			if (hasFocusedBefore.current) {
				void refreshProposals.current();
			} else {
				hasFocusedBefore.current = true;
			}
		}, [loadCompanies]),
	);

	useEffect(() => {
		if (!result || result.total === 0) return;
		const totalPages = Math.ceil(result.total / PROPOSAL_PAGE_SIZE);
		if (filters.page > totalPages) {
			setFilters((current) => ({ ...current, page: totalPages }));
		}
	}, [filters.page, result]);

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-7 border-b border-gray-200 pb-6">
					<Text className="font-inter font-bold text-gray-950 text-2xl">
						Propostas comerciais
					</Text>
					<Text className="mt-2 font-inter text-gray-500 text-sm">
						Acompanhe propostas por empresa, período, cliente, valor e situação.
					</Text>
				</View>

				<View className="gap-5">
					<ProposalFilters
						filters={filters}
						companies={companies}
						companiesError={companiesError}
						onChange={setFilters}
						onRetryCompanies={() => void loadCompanies()}
					/>

					{isLoading ? (
						<ProposalLoading />
					) : error ? (
						<ProposalError message={error} onRetry={() => void refresh()} />
					) : total === 0 ? (
						<ProposalEmpty filtered={hasFilters} />
					) : proposals.length ? (
						<>
							<View className="flex-row flex-wrap gap-3">
								<View className="min-w-[160px] flex-1 rounded-xl border border-gray-100 bg-white p-4">
									<Text className="font-inter text-gray-500 text-xs">
										Propostas no período
									</Text>
									<Text className="mt-1 font-inter font-bold text-gray-900 text-xl">
										{total}
									</Text>
								</View>
							</View>

							<ProposalCharts proposals={proposals} />

							<View className="gap-3">
								<Text className="font-inter font-bold text-gray-900 text-base">
									Lista de propostas
								</Text>
								<ProposalTable
									rows={proposals}
									onSelect={setSelectedProposal}
								/>
							</View>

							<ProposalPagination
								page={filters.page}
								total={total}
								loading={isLoading}
								onPageChange={(page) =>
									setFilters((current) => ({ ...current, page }))
								}
							/>
						</>
					) : (
						<ProposalEmpty filtered />
					)}
				</View>
			</ScrollView>
			<ProposalDetailModal
				proposal={selectedProposal}
				onClose={() => setSelectedProposal(null)}
				onOpenQuote={(proposal) => {
					setSelectedProposal(null);
					router.push(
						`/orcamento?quoteId=${encodeURIComponent(proposal.id)}` as never,
					);
				}}
			/>
		</View>
	);
}
