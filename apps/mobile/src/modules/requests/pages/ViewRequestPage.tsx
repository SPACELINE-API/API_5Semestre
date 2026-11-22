import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { CircleAlert, Inbox, RefreshCw, X } from 'lucide-react-native';

import CardRequest from '../components/CardRequest';
import {
	RequestSearchBar,
	RequestStatusFilterPanel,
} from '../components/RequestListControls';
import { QuotePagination } from '../../quotes/components/QuoteListControls';
import { fetchRequests } from '../services/requests';
import type { RequestItem } from '../services/requests';
import {
	REQUESTS_PAGE_SIZE,
	filterRequests,
	paginate,
	totalPagesFor,
	type RequestStatusFilter,
} from '../utils/requestFilters';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export default function ViewRequestPage() {
	const themeColors = useThemeColors();
	const [requests, setRequests] = useState<RequestItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [searchInput, setSearchInput] = useState('');
	const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
	const [showFilters, setShowFilters] = useState(false);
	const [page, setPage] = useState(1);

	const loadRequests = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			setRequests(await fetchRequests());
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível carregar as solicitações.',
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadRequests();
	}, [loadRequests]);

	const filtered = useMemo(
		() => filterRequests(requests, searchInput, statusFilter),
		[requests, searchInput, statusFilter],
	);
	const totalPages = totalPagesFor(filtered.length);
	const currentPage = Math.min(page, totalPages);
	const visibleRequests = useMemo(
		() => paginate(filtered, currentPage),
		[filtered, currentPage],
	);
	const hasActiveFilter = searchInput.trim() !== '' || statusFilter !== 'all';

	return (
		<View className="relative flex-1 bg-surface">
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-7">
					<Text className="font-inter font-bold text-foreground text-2xl">
						Requisições
					</Text>
					<Text className="mt-1 font-inter text-foreground-muted text-sm">
						Revise as solicitações recebidas e gere os orçamentos.
					</Text>
				</View>

				<RequestSearchBar
					searchInput={searchInput}
					onSearchInputChange={(value) => {
						setPage(1);
						setSearchInput(value);
					}}
					statusFilter={statusFilter}
					showFilters={showFilters}
					onToggleFilters={() => setShowFilters((current) => !current)}
				/>

				{loading ? (
					<View className="items-center gap-3 rounded-xl border border-border bg-surface p-10">
						<ActivityIndicator color={themeColors.primaryText} />
						<Text className="font-inter text-sm text-foreground-muted">
							Carregando solicitações...
						</Text>
					</View>
				) : error ? (
					<View className="rounded-2xl border border-danger/25 bg-surface p-5 md:p-6">
						<View className="flex-row items-start gap-3">
							<View className="h-10 w-10 items-center justify-center rounded-full bg-danger-soft">
								<CircleAlert size={20} color={themeColors.danger} />
							</View>
							<View className="flex-1 gap-1">
								<Text className="font-inter-semibold text-base text-foreground">
									Não foi possível carregar as solicitações
								</Text>
								<Text className="font-inter text-sm leading-5 text-foreground-secondary">
									{error}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => void loadRequests()}
							className="mt-5 flex-row items-center gap-2 self-start rounded-lg bg-primary px-4 py-2.5"
						>
							<RefreshCw size={15} color={themeColors.primaryForeground} />
							<Text className="font-inter-medium text-sm text-primary-foreground">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : filtered.length > 0 ? (
					<>
						<Text className="mb-4 font-inter text-sm text-foreground-muted">
							Exibindo {(currentPage - 1) * REQUESTS_PAGE_SIZE + 1}–
							{Math.min(currentPage * REQUESTS_PAGE_SIZE, filtered.length)} de{' '}
							{filtered.length}{' '}
							{filtered.length === 1 ? 'solicitação' : 'solicitações'}
						</Text>
						{visibleRequests.map((request) => (
							<CardRequest key={request.id} {...request} />
						))}
						<QuotePagination
							page={currentPage}
							totalPages={totalPages}
							loading={loading}
							onPageChange={setPage}
						/>
					</>
				) : (
					<View className="items-center rounded-xl border border-border bg-surface px-6 py-12">
						<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
							<Inbox size={22} color={themeColors.primaryText} />
						</View>
						<Text className="font-inter-bold text-base text-foreground">
							{hasActiveFilter
								? 'Nenhuma solicitação encontrada'
								: 'Nenhuma solicitação disponível'}
						</Text>
						<Text className="mt-1 text-center font-inter text-sm text-foreground-muted">
							{hasActiveFilter
								? 'Tente alterar a pesquisa ou selecionar outro status.'
								: 'As solicitações enviadas pelos clientes aparecem aqui.'}
						</Text>
					</View>
				)}
			</ScrollView>

			{showFilters && (
				<>
					<TouchableOpacity
						activeOpacity={1}
						onPress={() => setShowFilters(false)}
						className="absolute inset-0 z-10 bg-overlay/10"
					/>

					<View className="absolute bottom-0 right-0 top-0 z-20 w-[300px] gap-5 border-l border-border bg-surface p-5 shadow-xl">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-foreground text-base">
								Filtros
							</Text>

							<TouchableOpacity
								onPress={() => setShowFilters(false)}
								activeOpacity={0.7}
							>
								<X size={18} color={themeColors.foregroundMuted} />
							</TouchableOpacity>
						</View>

						<RequestStatusFilterPanel
							statusFilter={statusFilter}
							onStatusFilterChange={(value) => {
								setPage(1);
								setStatusFilter(value);
							}}
						/>

						{statusFilter !== 'all' && (
							<TouchableOpacity
								onPress={() => {
									setPage(1);
									setStatusFilter('all');
								}}
								activeOpacity={0.7}
								className="self-start"
							>
								<Text className="font-inter font-semibold text-primary-text text-sm">
									Limpar filtros
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</>
			)}
		</View>
	);
}
