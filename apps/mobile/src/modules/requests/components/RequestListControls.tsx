import { Check, Search, SlidersHorizontal } from 'lucide-react-native';
import { SearchTextInput } from '../../../shared/components/SearchTextInput';
import {
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import {
	REQUEST_STATUS_OPTIONS,
	type RequestStatusFilter,
} from '../utils/requestFilters';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function RequestSearchBar({
	searchInput,
	onSearchInputChange,
	statusFilter,
	showFilters,
	onToggleFilters,
}: {
	searchInput: string;
	onSearchInputChange: (value: string) => void;
	statusFilter: RequestStatusFilter;
	showFilters: boolean;
	onToggleFilters: () => void;
}) {
	const themeColors = useThemeColors();
	const { width } = useWindowDimensions();
	const filtersActive = showFilters || statusFilter !== 'all';

	return (
		<View className="mb-4 flex-row items-center gap-3">
			<View className="h-10 flex-1 flex-row items-center rounded-lg border border-border bg-surface px-3">
				<Search size={17} color={themeColors.foregroundSubtle} />
				<SearchTextInput
					value={searchInput}
					onChangeText={onSearchInputChange}
					placeholder={
						width < 768
							? 'Buscar solicitação, cliente ou documento'
							: 'Buscar por cliente, empresa, e-mail, documento ou idioma'
					}
					numberOfLines={1}
					placeholderTextColor={themeColors.foregroundSubtle}
					returnKeyType="search"
					accessibilityLabel="Buscar solicitação"
					className="ml-2 flex-1 border-0 font-inter text-ellipsis text-foreground text-sm outline-none max-md:min-w-0 max-md:shrink h-10"
				/>
			</View>

			<TouchableOpacity
				accessibilityRole="button"
				onPress={onToggleFilters}
				activeOpacity={0.7}
				className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-3 ${
					filtersActive
						? 'border-primary/40 bg-primary-soft'
						: 'border-border bg-surface'
				}`}
			>
				<SlidersHorizontal
					size={16}
					color={filtersActive ? '#1C6FB0' : '#6B7280'}
				/>
				<Text
					className={`font-inter font-medium text-sm ${
						filtersActive ? 'text-primary-strong' : 'text-foreground-secondary'
					}`}
				>
					Filtros
				</Text>
				{statusFilter !== 'all' && (
					<View className="h-1.5 w-1.5 rounded-full bg-primary" />
				)}
			</TouchableOpacity>
		</View>
	);
}

export function RequestStatusFilterPanel({
	statusFilter,
	onStatusFilterChange,
}: {
	statusFilter: RequestStatusFilter;
	onStatusFilterChange: (value: RequestStatusFilter) => void;
}) {
	const themeColors = useThemeColors();
	return (
		<View className="gap-1">
			<Text className="mb-2 font-inter font-semibold text-foreground-subtle text-xs uppercase tracking-wide">
				Status
			</Text>
			{REQUEST_STATUS_OPTIONS.map((option) => {
				const isSelected = statusFilter === option.value;

				return (
					<TouchableOpacity
						key={option.value}
						onPress={() => onStatusFilterChange(option.value)}
						activeOpacity={0.7}
						className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 ${
							isSelected ? 'bg-primary-soft' : ''
						}`}
					>
						<Text
							className={`font-inter text-sm ${
								isSelected
									? 'font-semibold text-primary-strong'
									: 'text-foreground-secondary'
							}`}
						>
							{option.label}
						</Text>
						{isSelected && <Check size={16} color={themeColors.primary} />}
					</TouchableOpacity>
				);
			})}
		</View>
	);
}
