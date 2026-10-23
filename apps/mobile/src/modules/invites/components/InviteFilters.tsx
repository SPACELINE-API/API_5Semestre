import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Check, Search, SlidersHorizontal } from 'lucide-react-native';
import type { InviteStatus } from '../types/invite';

export type InviteStatusFilter = InviteStatus | 'all';

const statusOptions: { value: InviteStatusFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'pendente', label: 'Pendentes' },
	{ value: 'aceito', label: 'Aceitos' },
	{ value: 'recusado', label: 'Recusados' },
	{ value: 'expirado', label: 'Expirados' },
];

type InviteSearchBarProps = {
	search: string;
	onSearchChange: (value: string) => void;
	statusFilter: InviteStatusFilter;
	showFilters: boolean;
	onToggleFilters: () => void;
};

export function InviteSearchBar({
	search,
	onSearchChange,
	statusFilter,
	showFilters,
	onToggleFilters,
}: InviteSearchBarProps) {
	const filtersActive = showFilters || statusFilter !== 'all';

	return (
		<View className="mb-4 flex-row items-center gap-3">
			<View className="h-10 flex-1 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
				<Search size={17} color="#9CA3AF" />
				<TextInput
					value={search}
					onChangeText={onSearchChange}
					placeholder="Buscar por documento ou idioma"
					placeholderTextColor="#9CA3AF"
					className="ml-2 flex-1 border-0 font-inter text-gray-800 text-sm outline-none h-10"
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

type InviteStatusFilterPanelProps = {
	statusFilter: InviteStatusFilter;
	onStatusFilterChange: (value: InviteStatusFilter) => void;
};

export function InviteStatusFilterPanel({
	statusFilter,
	onStatusFilterChange,
}: InviteStatusFilterPanelProps) {
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
