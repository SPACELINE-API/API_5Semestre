import { useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { FilterX } from 'lucide-react-native';
import { DateField } from '../../../shared/components/DateField';
import { SelectField } from '../../../shared/components/SelectField';
import type {
	ProposalFilters as Filters,
	ProposalSortField,
	ProposalStatus,
} from '../types/proposal';

const SORT_OPTIONS: { value: ProposalSortField; label: string }[] = [
	{ value: 'created_at', label: 'Data de criação' },
	{ value: 'customer_name', label: 'Cliente' },
	{ value: 'enterprise', label: 'Empresa' },
	{ value: 'status', label: 'Situação' },
];

const STATUS_OPTIONS: { value: ProposalStatus; label: string }[] = [
	{ value: 'pending', label: 'Pendente' },
	{ value: 'approved', label: 'Aprovada' },
	{ value: 'reproved', label: 'Reprovada' },
];

export function ProposalFilters({
	filters,
	onChange,
}: {
	filters: Filters;
	onChange: (filters: Filters) => void;
}) {
	const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
	const hasFilters = Boolean(
		filters.startDate || filters.endDate || filters.status !== 'all',
	);

	function clearFilters() {
		onChange({
			...filters,
			startDate: '',
			endDate: '',
			status: 'all',
			page: 1,
		});
	}

	function trackOpen(field: 'start' | 'end') {
		if (Platform.OS !== 'web') return undefined;
		return (open: boolean) => setOpenDate(open ? field : null);
	}

	return (
		<View className="gap-4 rounded-xl border border-gray-100 bg-white p-4 md:p-5">
			<View className="flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
				<View
					className="min-w-0 flex-1 flex-row gap-3"
					style={{ zIndex: openDate === 'start' ? 50 : 2 }}
				>
					<DateField
						label="De"
						value={filters.startDate}
						placeholder="Início"
						onChangeText={(startDate) =>
							onChange({
								...filters,
								startDate,
								endDate: filters.endDate && startDate > filters.endDate ? '' : filters.endDate,
								page: 1,
							})
						}
						onOpenChange={trackOpen('start')}
					/>
					<View
						className="min-w-0 flex-1 flex-row"
						style={{ zIndex: openDate === 'end' ? 50 : 2 }}
					>
						<DateField
							label="Até"
							value={filters.endDate}
							placeholder="Fim"
							minDate={filters.startDate || undefined}
							onChangeText={(endDate) => onChange({ ...filters, endDate, page: 1 })}
							onOpenChange={trackOpen('end')}
						/>
					</View>
				</View>
				<View className="min-w-0 flex-1">
					<SelectField
						label="Situação"
						value={filters.status}
						allLabel="Todas as situações"
						options={STATUS_OPTIONS}
						onChange={(value) =>
							onChange({
								...filters,
								status: value ? (value as ProposalStatus) : 'all',
								page: 1,
							})
						}
					/>
				</View>
				<View className="min-w-0 flex-1">
					<SelectField
						label="Ordenar por"
						value={filters.orderBy}
						options={SORT_OPTIONS}
						onChange={(value) =>
							onChange({ ...filters, orderBy: value as ProposalSortField, page: 1 })
						}
					/>
				</View>
				<TouchableOpacity
					accessibilityRole="button"
					accessibilityLabel={filters.orderDir === 'desc' ? 'Ordem decrescente' : 'Ordem crescente'}
					onPress={() =>
						onChange({
							...filters,
							orderDir: filters.orderDir === 'desc' ? 'asc' : 'desc',
							page: 1,
						})
					}
					className="h-11 items-center justify-center rounded-lg border border-gray-300 px-4"
				>
					<Text className="font-inter font-medium text-gray-700 text-sm">
						{filters.orderBy === 'created_at'
							? filters.orderDir === 'desc'
								? 'Mais recentes'
								: 'Mais antigas'
							: filters.orderDir === 'desc'
								? 'Decrescente'
								: 'Crescente'}
					</Text>
				</TouchableOpacity>
			</View>
			{hasFilters && (
				<TouchableOpacity
					onPress={clearFilters}
					activeOpacity={0.7}
					accessibilityRole="button"
					className="flex-row items-center gap-1.5 self-start"
				>
					<FilterX size={14} color="#1C6FB0" />
					<Text className="font-inter font-semibold text-blue-600 text-sm">
						Limpar filtros
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);
}
