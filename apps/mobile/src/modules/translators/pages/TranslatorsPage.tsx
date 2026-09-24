import { useState } from 'react';

import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';

import { SlidersHorizontal, AlertCircle, X } from 'lucide-react-native';

import { useTranslators } from '../hooks/useTranslators';

import {
	TranslatorFilters,
	type AvailabilityFilter,
} from '../components/TranslatorFilters';

import { TranslatorTable } from '../components/TranslatorTable';

export function TranslatorsPage() {
	const [languageFilter, setLanguageFilter] = useState('');
	const [specialtyFilter, setSpecialtyFilter] = useState('');
	const [availabilityFilter, setAvailabilityFilter] =
		useState<AvailabilityFilter>('all');
	const [showFilters, setShowFilters] = useState(false);

	const { translators, total, isLoading, error } = useTranslators({
		language: languageFilter || undefined,
		specialty: specialtyFilter || undefined,
		status:
			availabilityFilter === 'all' ? undefined : availabilityFilter === 'active',
	});

	const hasActiveFilters =
		languageFilter.length > 0 ||
		specialtyFilter.length > 0 ||
		availabilityFilter !== 'all';

	function clearFilters() {
		setLanguageFilter('');
		setSpecialtyFilter('');
		setAvailabilityFilter('all');
	}

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
				<View className="gap-6">
					<View className="border-b border-gray-200 pb-6">
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Recursos
						</Text>

						<View className="mt-2 flex-row items-center gap-2">
							<Text className="font-inter text-gray-500 text-sm">
								{total} {total === 1 ? 'recurso' : 'recursos'}
							</Text>
						</View>
					</View>

					<View className="gap-3">
						<View className="flex-row items-center justify-end gap-3">
							<TouchableOpacity
								onPress={() => setShowFilters(!showFilters)}
								activeOpacity={0.7}
								className={`
									h-10
									flex-row
									items-center
									justify-center
									gap-2
									rounded-lg
									border
									px-3
									${
										showFilters || hasActiveFilters
											? 'border-blue-300 bg-blue-50'
											: 'border-gray-200 bg-white'
									}
								`}
							>
								<SlidersHorizontal
									size={16}
									color={
										showFilters || hasActiveFilters ? '#1C6FB0' : '#6B7280'
									}
								/>

								<Text
									className={`font-inter font-medium text-sm ${
										showFilters || hasActiveFilters
											? 'text-blue-900'
											: 'text-gray-600'
									}`}
								>
									Filtros
								</Text>

								{hasActiveFilters && (
									<View className="h-1.5 w-1.5 rounded-full bg-blue-600" />
								)}
							</TouchableOpacity>
						</View>

						<Text className="font-inter text-gray-400 text-xs">
							{total} {total === 1 ? 'resultado' : 'resultados'}
						</Text>
					</View>

					{isLoading && (
						<View className="items-center justify-center border-t border-gray-100 py-16">
							<ActivityIndicator color="#6B7280" />

							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando recursos...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />

								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar os recursos
								</Text>
							</View>

							<Text className="mt-1 font-inter text-gray-500 text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-gray-200">
							<TranslatorTable translators={translators} />
						</View>
					)}
				</View>
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

						<TranslatorFilters
							availabilityFilter={availabilityFilter}
							onAvailabilityFilterChange={setAvailabilityFilter}
							languageFilter={languageFilter}
							onLanguageFilterChange={setLanguageFilter}
							specialtyFilter={specialtyFilter}
							onSpecialtyFilterChange={setSpecialtyFilter}
						/>

						{hasActiveFilters && (
							<TouchableOpacity
								onPress={clearFilters}
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
