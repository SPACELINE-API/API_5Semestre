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

export default function ViewRequestPage() {
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
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-7">
					<Text className="font-inter font-bold text-gray-950 text-2xl">
						Requisições
					</Text>
					<Text className="mt-1 font-inter text-gray-500 text-sm">
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
					<View className="items-center gap-3 rounded-xl border border-gray-200 bg-white p-10">
						<ActivityIndicator color="#2563eb" />
						<Text className="font-inter text-sm text-gray-500">
							Carregando solicitações...
						</Text>
					</View>
				) : error ? (
					<View className="rounded-2xl border border-red-100 bg-white p-5 md:p-6">
						<View className="flex-row items-start gap-3">
							<View className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
								<CircleAlert size={20} color="#dc2626" />
							</View>
							<View className="flex-1 gap-1">
								<Text className="font-inter-semibold text-base text-gray-900">
									Não foi possível carregar as solicitações
								</Text>
								<Text className="font-inter text-sm leading-5 text-gray-600">
									{error}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => void loadRequests()}
							className="mt-5 flex-row items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5"
						>
							<RefreshCw size={15} color="#ffffff" />
							<Text className="font-inter-medium text-sm text-white">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : filtered.length > 0 ? (
					<>
						<Text className="mb-4 font-inter text-sm text-gray-500">
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
					<View className="items-center rounded-xl border border-gray-200 bg-white px-6 py-12">
						<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-blue-50">
							<Inbox size={22} color="#2563eb" />
						</View>
						<Text className="font-inter-bold text-base text-gray-900">
							{hasActiveFilter
								? 'Nenhuma solicitação encontrada'
								: 'Nenhuma solicitação disponível'}
						</Text>
						<Text className="mt-1 text-center font-inter text-sm text-gray-500">
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
						className="absolute inset-0 z-10 bg-black/10"
					/>

					<View className="absolute bottom-0 right-0 top-0 z-20 w-[300px] gap-5 border-l border-gray-200 bg-white p-5 shadow-xl">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-gray-900 text-base">
								Filtros
							</Text>

							<TouchableOpacity
								onPress={() => setShowFilters(false)}
								activeOpacity={0.7}
							>
								<X size={18} color="#8A8A8A" />
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
								<Text className="font-inter font-semibold text-blue-600 text-sm">
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
