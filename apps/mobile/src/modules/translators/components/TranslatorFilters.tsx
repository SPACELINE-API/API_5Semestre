import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';

export type AvailabilityFilter = 'all' | 'active' | 'inactive';

type TranslatorFiltersProps = {
	availabilityFilter: AvailabilityFilter;
	onAvailabilityFilterChange: (value: AvailabilityFilter) => void;
	languageFilter: string;
	onLanguageFilterChange: (value: string) => void;
	specialtyFilter: string;
	onSpecialtyFilterChange: (value: string) => void;
};

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
	{ value: 'all', label: 'Todos' },
	{ value: 'active', label: 'Ativo' },
	{ value: 'inactive', label: 'Inativo' },
];

export function TranslatorFilters({
	availabilityFilter,
	onAvailabilityFilterChange,
	languageFilter,
	onLanguageFilterChange,
	specialtyFilter,
	onSpecialtyFilterChange,
}: TranslatorFiltersProps) {
	return (
		<View className="gap-5">
			<View className="gap-1">
				<Text className="mb-2 font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">
					Disponibilidade
				</Text>
				{AVAILABILITY_OPTIONS.map((option) => {
					const isSelected = availabilityFilter === option.value;

					return (
						<TouchableOpacity
							key={option.value}
							onPress={() => onAvailabilityFilterChange(option.value)}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={`Filtrar por disponibilidade ${option.label}`}
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

			<View className="gap-2">
				<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">
					Idioma
				</Text>
				<TextInput
					value={languageFilter}
					onChangeText={onLanguageFilterChange}
					placeholder="Ex: en, pt-BR"
					placeholderTextColor="#9CA3AF"
					className="h-10 rounded-lg border border-gray-200 px-3 font-inter text-gray-800 text-sm outline-none"
				/>
			</View>

			<View className="gap-2">
				<Text className="font-inter font-semibold text-gray-400 text-xs uppercase tracking-wide">
					Especialidade
				</Text>
				<TextInput
					value={specialtyFilter}
					onChangeText={onSpecialtyFilterChange}
					placeholder="Ex: Jurídico"
					placeholderTextColor="#9CA3AF"
					className="h-10 rounded-lg border border-gray-200 px-3 font-inter text-gray-800 text-sm outline-none"
				/>
			</View>
		</View>
	);
}
