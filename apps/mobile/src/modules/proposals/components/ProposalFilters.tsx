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
	companies,
	companiesError,
	onChange,
	onRetryCompanies,
}: {
	filters: Filters;
	companies: string[];
	companiesError: string | null;
	onChange: (filters: Filters) => void;
	onRetryCompanies: () => void;
}) {
	const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
	const hasFilters = Boolean(
		filters.startDate ||
			filters.endDate ||
			filters.status !== 'all' ||
			filters.enterprise,
	);

	function clearFilters() {
		onChange({
			...filters,
			startDate: '',
			endDate: '',
			status: 'all',
			enterprise: '',
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
						label="Empresa"
						value={filters.enterprise}
						allLabel="Todas as empresas"
						options={companies.map((company) => ({
							value: company,
							label: company,
						}))}
						searchable
						onChange={(enterprise) =>
							onChange({ ...filters, enterprise, page: 1 })
						}
					/>
					{companiesError && (
						<View className="mt-2 flex-row flex-wrap items-center gap-2">
							<Text className="font-inter text-red-600 text-xs">
								{companiesError}
							</Text>
							<TouchableOpacity onPress={onRetryCompanies} accessibilityRole="button">
								<Text className="font-inter font-semibold text-blue-600 text-xs">
									Tentar novamente
								</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>
				<View className="min-w-0 flex-1">
					<SelectField
						label="Situação"
						value={filters.status}
						allLabel="Todas as situações"
						options={STATUS_OPTIONS}
						searchable={false}
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
						allLabel="Ordenar por"
						options={SORT_OPTIONS}
						searchable={false}
						onChange={(value) =>
							onChange({ ...filters, orderBy: value as ProposalSortField, page: 1 })
						}
					/>
				</View>
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
