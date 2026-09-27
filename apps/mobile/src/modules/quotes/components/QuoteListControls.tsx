import { ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { QuoteStatusFilter } from '../services/quotesService';

const statusOptions: { value: QuoteStatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'pending', label: 'Pendentes' },
	{ value: 'approved', label: 'Aprovados' },
	{ value: 'reproved', label: 'Reprovados' },
];

export function QuoteFilters({
	searchInput,
	onSearchInputChange,
	onSearch,
	statusFilter,
	onStatusFilterChange,
}: {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	onSearch: () => void;
	statusFilter: QuoteStatusFilter;
	onStatusFilterChange: (value: QuoteStatusFilter) => void;
}) {
	return (
		<View className="mb-6 gap-4 rounded-xl border border-gray-200 bg-white p-4">
			<View className="flex-col gap-3 md:flex-row">
				<View className="min-h-11 flex-1 flex-row items-center gap-2 rounded-lg border border-gray-300 px-3">
					<Search size={17} color="#6b7280" />
					<TextInput
						value={searchInput}
						onChangeText={onSearchInputChange}
						onSubmitEditing={onSearch}
						placeholder="Buscar por orçamento, e-mail, cliente, empresa ou documento"
						returnKeyType="search"
						className="h-11 min-w-0 flex-1 font-inter text-sm text-gray-900"
					/>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					onPress={onSearch}
					className="min-h-11 flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-5"
				>
					<Search size={16} color="#fff" />
					<Text className="font-inter-medium text-sm text-white">Buscar</Text>
				</TouchableOpacity>
			</View>

			<View className="flex-row flex-wrap items-center gap-2">
				<Text className="mr-1 font-inter-medium text-sm text-gray-600">
					Status:
				</Text>
				{statusOptions.map(({ value, label }) => {
					const selected = statusFilter === value;
					return (
						<TouchableOpacity
							key={value}
							accessibilityRole="button"
							accessibilityState={{ selected }}
							onPress={() => onStatusFilterChange(value)}
							className={`rounded-full px-3.5 py-2 ${selected ? 'bg-blue-600' : 'bg-gray-100'}`}
						>
							<Text
								className={`font-inter-medium text-xs ${selected ? 'text-white' : 'text-gray-700'}`}
							>
								{label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>
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
		<View className="mb-5 flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
			<TouchableOpacity
				accessibilityRole="button"
				disabled={page <= 1 || loading}
				onPress={() => onPageChange(Math.max(1, page - 1))}
				className={`flex-row items-center gap-1 rounded-lg px-3 py-2 ${page <= 1 ? 'opacity-40' : 'hover:bg-gray-100'}`}
			>
				<ChevronLeft size={17} color="#374151" />
				<Text className="font-inter-medium text-sm text-gray-700">
					Anterior
				</Text>
			</TouchableOpacity>
			<Text className="font-inter text-sm text-gray-600">
				Página {page} de {Math.max(totalPages, 1)} · até 10 por página
			</Text>
			<TouchableOpacity
				accessibilityRole="button"
				disabled={page >= totalPages || loading}
				onPress={() => onPageChange(page + 1)}
				className={`flex-row items-center gap-1 rounded-lg px-3 py-2 ${page >= totalPages ? 'opacity-40' : 'hover:bg-gray-100'}`}
			>
				<Text className="font-inter-medium text-sm text-gray-700">Próxima</Text>
				<ChevronRight size={17} color="#374151" />
			</TouchableOpacity>
		</View>
	);
}
