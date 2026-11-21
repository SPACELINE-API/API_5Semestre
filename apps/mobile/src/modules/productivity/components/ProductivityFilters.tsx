import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { FilterX } from 'lucide-react-native';
import { DateField } from '../../../shared/components/DateField';
import { SelectField } from '../../../shared/components/SelectField';
import type {
	ProductivityFilterOptions,
	ProductivityFilters as Filters,
} from '../types/productivity';
import {
	PERIOD_PRESETS,
	activePreset,
	defaultFilters,
	rangeForPreset,
	type PeriodPreset,
} from '../utils/filters';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type ProductivityFiltersProps = {
	filters: Filters;
	options: ProductivityFilterOptions;
	onChange: (filters: Filters) => void;
};

export function ProductivityFilters({
	filters,
	options,
	onChange,
}: ProductivityFiltersProps) {
	const themeColors = useThemeColors();
	const [openField, setOpenField] = useState<'from' | 'to' | null>(null);
	const preset = activePreset(filters);
	const isDefault =
		JSON.stringify(filters) === JSON.stringify(defaultFilters());

	function applyPreset(key: PeriodPreset) {
		onChange({ ...filters, ...rangeForPreset(key) });
	}

	function trackOpen(field: 'from' | 'to') {
		if (Platform.OS !== 'web') return undefined;
		return (open: boolean) => setOpenField(open ? field : null);
	}

	return (
		<View className="gap-4 rounded-xl border border-border-subtle bg-surface p-4 md:p-5">
			<View className="flex-row flex-wrap items-center gap-2">
				<Text className="mr-1 font-inter font-semibold text-foreground text-xs">
					Período
				</Text>
				{PERIOD_PRESETS.map((item) => {
					const isActive = preset === item.key;

					return (
						<TouchableOpacity
							key={item.key}
							onPress={() => applyPreset(item.key)}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityState={{ selected: isActive }}
							className={`rounded-full border px-3 py-1.5 ${
								isActive
									? 'border-primary/40 bg-primary-soft'
									: 'border-border-strong bg-surface'
							}`}
						>
							<Text
								className={`font-inter text-xs ${
									isActive
										? 'font-semibold text-primary-strong'
										: 'text-foreground-secondary'
								}`}
							>
								{item.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<View className="flex-col gap-3 md:flex-row md:flex-wrap">
				<View className="flex-row gap-3 md:w-[420px]">
					<View
						className="min-w-0 flex-1 flex-row"
						style={{ zIndex: openField === 'from' ? 50 : 2 }}
					>
						<DateField
							label="De"
							value={filters.dateFrom}
							onChangeText={(value) =>
								onChange({ ...filters, dateFrom: value })
							}
							onOpenChange={trackOpen('from')}
						/>
					</View>
					<View
						className="min-w-0 flex-1 flex-row"
						style={{ zIndex: openField === 'to' ? 50 : 2 }}
					>
						<DateField
							label="Até"
							value={filters.dateTo}
							onChangeText={(value) => onChange({ ...filters, dateTo: value })}
							minDate={filters.dateFrom}
							onOpenChange={trackOpen('to')}
						/>
					</View>
				</View>
				<View className="md:min-w-[220px] md:flex-1">
					<SelectField
						label="Profissional"
						value={filters.translatorId}
						allLabel="Todos os profissionais"
						options={options.translators.map((translator) => ({
							value: translator.id,
							label: translator.name,
						}))}
						onChange={(value) => onChange({ ...filters, translatorId: value })}
					/>
				</View>
				<View className="md:min-w-[220px] md:flex-1">
					<SelectField
						label="Projeto"
						value={filters.serviceOrderId}
						allLabel="Todos os projetos"
						options={options.projects.map((project) => ({
							value: project.id,
							label: project.project_name,
						}))}
						onChange={(value) =>
							onChange({ ...filters, serviceOrderId: value })
						}
					/>
				</View>
			</View>

			{!isDefault && (
				<TouchableOpacity
					onPress={() => onChange(defaultFilters())}
					activeOpacity={0.7}
					accessibilityRole="button"
					className="flex-row items-center gap-1.5 self-start"
				>
					<FilterX size={14} color={themeColors.primary} />
					<Text className="font-inter font-semibold text-primary-text text-sm">
						Limpar filtros
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}
