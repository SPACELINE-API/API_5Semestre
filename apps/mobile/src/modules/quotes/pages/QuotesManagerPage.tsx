import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CircleAlert, FileText, Plus, RefreshCw, X } from 'lucide-react-native';
import { listQuotes, updateQuoteStatus } from '../services/quotesService';
import type {
	ManagedQuote,
	QuoteStatusFilter,
} from '../services/quotesService';
import { QuoteCard } from '../components/QuoteCard';
import {
	QuotePagination,
	QuoteSearchBar,
	QuoteStatusFilterPanel,
} from '../components/QuoteListControls';
import { NewQuoteModal } from './translation-itens/index';

export default function QuotesManagerPage() {
	const router = useRouter();
	const [quotes, setQuotes] = useState<ManagedQuote[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [searchInput, setSearchInput] = useState('');
	const [appliedSearch, setAppliedSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<QuoteStatusFilter>('all');
	const [totalQuotes, setTotalQuotes] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [showFilters, setShowFilters] = useState(false);
	const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);

	const loadQuotes = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const result = await listQuotes({
				page,
				search: appliedSearch,
				status: statusFilter,
			});
			setQuotes(result.items);
			setTotalQuotes(result.total);
			setTotalPages(result.total_pages);
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: 'Não foi possível carregar os orçamentos.',
			);
		} finally {
			setLoading(false);
		}
	}, [appliedSearch, page, statusFilter]);

	const handleDecision = useCallback(
		async (
			quoteId: string,
			status: 'approved' | 'reproved',
			reason?: string,
		): Promise<string | null> => {
			setUpdatingQuoteId(quoteId);
			const result = await updateQuoteStatus(quoteId, status, reason);
			if (result.success) {
				setQuotes((current) =>
					current.map((quote) =>
						quote.id === quoteId ? { ...quote, ...result.data } : quote,
					),
				);
				setUpdatingQuoteId(null);
				return null;
			} else {
				const message =
					result.detail ??
					(result.status === 0
						? 'Não foi possível conectar ao servidor.'
						: `Não foi possível atualizar o orçamento (${result.status}).`);
				if (result.status === 409) void loadQuotes();
				setUpdatingQuoteId(null);
				return message;
			}
		},
		[loadQuotes],
	);

	useEffect(() => {
		void loadQuotes();
	}, [loadQuotes]);

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="
					px-5
					py-6
					md:px-10
					md:py-8
					md:max-w-[1200px]
					md:w-full
					md:self-center
				"
			>
				<View className="mb-7 flex-row flex-wrap items-center justify-between gap-4">
					<View className="flex-1">
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Orçamentos
						</Text>
						<Text className="mt-1 font-inter text-gray-500 text-sm">
							Gerencie os orçamentos e consulte os documentos cadastrados.
						</Text>
					</View>
					<TouchableOpacity
						accessibilityRole="button"
						onPress={() => setShowNewQuoteModal(true)}
						className="flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3"
					>
						<Plus size={18} color="#ffffff" />
						<Text className="font-inter-medium text-sm text-white">
							Novo orçamento
						</Text>
					</TouchableOpacity>
				</View>

				<QuoteSearchBar
					searchInput={searchInput}
					onSearchInputChange={setSearchInput}
					onSearch={() => {
						setPage(1);
						setAppliedSearch(searchInput.trim());
					}}
					statusFilter={statusFilter}
					showFilters={showFilters}
					onToggleFilters={() => setShowFilters((current) => !current)}
				/>

				{loading ? (
					<View className="items-center gap-3 rounded-xl border border-gray-200 bg-white p-10">
						<ActivityIndicator color="#2563eb" />
						<Text className="font-inter text-sm text-gray-500">
							Carregando orçamentos...
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
									Não foi possível carregar os orçamentos
								</Text>
								<Text className="font-inter text-sm leading-5 text-gray-600">
									{error}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => void loadQuotes()}
							className="mt-5 flex-row items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2.5"
						>
							<RefreshCw size={15} color="#ffffff" />
							<Text className="font-inter-medium text-sm text-white">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : quotes.length ? (
					<>
						<Text className="mb-4 font-inter text-sm text-gray-500">
							Exibindo {(page - 1) * 10 + 1}–{Math.min(page * 10, totalQuotes)}{' '}
							de {totalQuotes} {totalQuotes === 1 ? 'orçamento' : 'orçamentos'}
						</Text>
						{quotes.map((quote) => (
							<QuoteCard
								key={quote.id}
								quote={quote}
								updating={updatingQuoteId === quote.id}
								onDecide={(status, reason) =>
									handleDecision(quote.id, status, reason)
								}
								onOpenServiceOrder={() =>
									router.push(
										`/ordens-de-servico/${quote.service_order_id}` as never,
									)
								}
								onQuoteChange={(updated) =>
									setQuotes((current) =>
										current.map((existing) =>
											existing.id === updated.id ? updated : existing,
										),
									)
								}
							/>
						))}
						<QuotePagination
							page={page}
							totalPages={totalPages}
							loading={loading}
							onPageChange={setPage}
						/>
					</>
				) : (
					<View className="items-center rounded-xl border border-gray-200 bg-white px-6 py-12">
						<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-blue-50">
							<FileText size={22} color="#2563eb" />
						</View>
						<Text className="font-inter-bold text-base text-gray-900">
							{totalQuotes === 0 && (appliedSearch || statusFilter !== 'all')
								? 'Nenhum orçamento encontrado'
								: 'Nenhum orçamento cadastrado'}
						</Text>
						<Text className="mt-1 text-center font-inter text-sm text-gray-500">
							{totalQuotes === 0 && (appliedSearch || statusFilter !== 'all')
								? 'Tente alterar a pesquisa ou selecionar outro status.'
								: 'Crie um orçamento para começar a gerenciar os registros.'}
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

						<QuoteStatusFilterPanel
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

			<NewQuoteModal
				visible={showNewQuoteModal}
				onClose={() => setShowNewQuoteModal(false)}
				onCreated={() => {
					setShowNewQuoteModal(false);
					void loadQuotes();
				}}
			/>
		</View>
	);
}
