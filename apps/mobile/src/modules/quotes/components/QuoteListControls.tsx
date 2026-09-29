import {
	Check,
	ChevronLeft,
	ChevronRight,
	Search,
	SlidersHorizontal,
} from 'lucide-react-native';
import {
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import type { QuoteStatusFilter } from '../services/quotesService';

const statusOptions: { value: QuoteStatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'pending', label: 'Pendentes' },
	{ value: 'approved', label: 'Aprovados' },
	{ value: 'reproved', label: 'Reprovados' },
];

export function QuoteSearchBar({
	searchInput,
	onSearchInputChange,
	onSearch,
	statusFilter,
	showFilters,
	onToggleFilters,
}: {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	onSearch: () => void;
	statusFilter: QuoteStatusFilter;
	showFilters: boolean;
	onToggleFilters: () => void;
}) {
	const { width } = useWindowDimensions();
	const filtersActive = showFilters || statusFilter !== 'all';

	return (
		<View className="mb-4 flex-row items-center gap-3">
			<View className="h-10 flex-1 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
				<Search size={17} color="#9CA3AF" />
				<TextInput
					value={searchInput}
					onChangeText={onSearchInputChange}
					onSubmitEditing={onSearch}
					placeholder={
						width < 768
							? 'Buscar orçamento, cliente ou documento'
							: 'Buscar por orçamento, e-mail, cliente, empresa ou documento'
					}
					placeholderTextColor="#9CA3AF"
					returnKeyType="search"
					className="ml-2 flex-1 border-0 font-inter text-gray-800 text-sm outline-none max-md:min-w-0 max-md:shrink max-md:leading-5"
				/>
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				onPress={onToggleFilters}
				activeOpacity={0.7}
				className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-3 ${
					filtersActive
						? 'border-blue-300 bg-blue-50'
						: 'border-gray-200 bg-white'
				}`}
			>
				<SlidersHorizontal
					size={16}
					color={filtersActive ? '#1C6FB0' : '#6B7280'}
				/>
				<Text
					className={`font-inter font-medium text-sm ${
						filtersActive ? 'text-blue-900' : 'text-gray-600'
					}`}
				>
					Filtros
				</Text>
				{statusFilter !== 'all' && (
					<View className="h-1.5 w-1.5 rounded-full bg-blue-600" />
				)}
			</TouchableOpacity>
		</View>
	);
}

export function QuoteStatusFilterPanel({
	statusFilter,
	onStatusFilterChange,
}: {
	statusFilter: QuoteStatusFilter;
	onStatusFilterChange: (value: QuoteStatusFilter) => void;
}) {
	return (
		<View className="gap-1">
			<Text className="mb-2 font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">
				Status
			</Text>
			{statusOptions.map((option) => {
				const isSelected = statusFilter === option.value;

				return (
					<TouchableOpacity
						key={option.value}
						onPress={() => onStatusFilterChange(option.value)}
						activeOpacity={0.7}
						className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
							isSelected ? 'bg-blue-50' : ''
						}`}
					>
						<Text
							className={`font-inter text-sm ${
								isSelected ? 'font-semibold text-blue-900' : 'text-gray-700'
							}`}
						>
							{option.label}
						</Text>
						{isSelected && <Check size={16} color="#1C6FB0" />}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

export function QuotePagination({
	page,
	totalPages,
	loading,
	onPageChange,
}: {
	page: number;
	totalPages: number;
	loading: boolean;
	onPageChange: (page: number) => void;
}) {
	return (
		<View className="mb-5 flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 md:flex-row md:justify-between">
			<Text className="order-first font-inter text-sm text-gray-600 md:order-none">
				Página {page} de {Math.max(totalPages, 1)} · até 10 por página
			</Text>
			<View className="w-full flex-row items-center justify-between gap-3 md:order-none md:w-auto md:justify-start">
				<TouchableOpacity
					accessibilityRole="button"
					disabled={page <= 1 || loading}
					onPress={() => onPageChange(Math.max(1, page - 1))}
					className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg px-3 py-2 md:flex-none ${page <= 1 ? 'opacity-40' : 'hover:bg-gray-100'}`}
				>
					<ChevronLeft size={17} color="#374151" />
					<Text className="font-inter-medium text-sm text-gray-700">
						Anterior
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					accessibilityRole="button"
					disabled={page >= totalPages || loading}
					onPress={() => onPageChange(page + 1)}
					className={`flex-1 flex-row items-center justify-center gap-1 rounded-lg px-3 py-2 md:flex-none ${page >= totalPages ? 'opacity-40' : 'hover:bg-gray-100'}`}
				>
					<Text className="font-inter-medium text-sm text-gray-700">
						Próxima
					</Text>
					<ChevronRight size={17} color="#374151" />
				</TouchableOpacity>
			</View>
		</View>
	);
}
