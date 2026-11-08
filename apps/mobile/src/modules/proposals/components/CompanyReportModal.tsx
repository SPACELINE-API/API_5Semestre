import { useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { AppModal } from '../../../shared/components/AppModal';
import { DateField } from '../../../shared/components/DateField';
import { SelectField } from '../../../shared/components/SelectField';
import { ApiError } from '../../../shared/services/publicApiClient';
import {
	downloadCompanyReport,
	listReportCompanies,
} from '../services/proposalService';
import type { ReportCompanyOption, ReportFormat } from '../types/report';

const GRANULARITY_OPTIONS = [
	{ value: 'days', label: 'Dias' },
	{ value: 'months', label: 'Meses' },
	{ value: 'years', label: 'Anos' },
];

const FORMAT_OPTIONS = [
	{ value: 'csv', label: 'CSV' },
	{ value: 'xlsx', label: 'Excel' },
];

function reportErrorMessage(error: unknown): string {
	const message =
		error instanceof ApiError
			? error.message
			: error instanceof Error
				? error.message
				: '';
	const translations: Record<string, string> = {
		'No companies selected.': 'Selecione ao menos uma empresa.',
		'No data found for the selected period.':
			'Nenhuma empresa selecionada possui dados no período informado.',
		'Invalid date range.':
			'A data inicial não pode ser posterior à data final.',
		'Failed to generate report.':
			'Não foi possível gerar o relatório. Tente novamente.',
	};
	if (message && translations[message]) return translations[message];
	return 'Não foi possível gerar o relatório. Tente novamente.';
}

export function CompanyReportModal({
	visible,
	onClose,
	onSuccess,
}: {
	visible: boolean;
	onClose: () => void;
	onSuccess?: (message: string) => void;
}) {
	const [companies, setCompanies] = useState<ReportCompanyOption[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectAll, setSelectAll] = useState(false);
	const [search, setSearch] = useState('');
	const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
	const [granularity, setGranularity] = useState<
		'days' | 'months' | 'years' | ''
	>('');
	const [format, setFormat] = useState<ReportFormat | ''>('');
	const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const wasVisible = useRef(false);

	useEffect(() => {
		if (visible && !wasVisible.current) resetReportForm();
		wasVisible.current = visible;
	}, [visible]);

	useEffect(() => {
		if (!visible || companies.length > 0) return;
		setIsLoadingCompanies(true);
		void listReportCompanies()
			.then(setCompanies)
			.catch((cause) => setError(reportErrorMessage(cause)))
			.finally(() => setIsLoadingCompanies(false));
	}, [companies.length, visible]);

	const visibleCompanies = useMemo(() => {
		const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
		if (!normalizedSearch) return companies;
		return companies.filter((company) =>
			company.trade_name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
		);
	}, [companies, search]);

	const selectedCompanies = companies.filter((company) =>
		selectedIds.includes(company.id),
	);
	const selectedCount = selectAll ? companies.length : selectedIds.length;

	function resetReportForm() {
		setSelectedIds([]);
		setSelectAll(false);
		setSearch('');
		setIsCompanyPickerOpen(false);
		setStartDate('');
		setEndDate('');
		setOpenDate(null);
		setGranularity('');
		setFormat('');
		setError(null);
		setSuccess(null);
	}

	function toggleCompany(companyId: string) {
		setSelectAll(false);
		setSelectedIds((current) =>
			current.includes(companyId)
				? current.filter((id) => id !== companyId)
				: [...current, companyId],
		);
		setError(null);
		setSuccess(null);
	}

	function toggleSelectAll() {
		setSelectAll((current) => !current);
		setSelectedIds([]);
		setIsCompanyPickerOpen(false);
		setError(null);
		setSuccess(null);
	}

	function clearSelection() {
		setSelectAll(false);
		setSelectedIds([]);
		setError(null);
		setSuccess(null);
	}

	async function handleGenerate() {
		setError(null);
		setSuccess(null);
		if (!selectAll && selectedIds.length === 0) {
			setError('Selecione ao menos uma empresa.');
			return;
		}
		if (!startDate || !endDate) {
			setError('Informe o período inicial e final.');
			return;
		}
		if (!format) {
			setError('Selecione o formato do relatório.');
			return;
		}
		if (startDate > endDate) {
			setError('A data inicial não pode ser posterior à data final.');
			return;
		}
		if (!granularity) {
			setError('Selecione a granularidade do relatório.');
			return;
		}

		setIsGenerating(true);
		try {
			const baseRequest = {
				selection: selectAll ? ('all' as const) : ('selected' as const),
				...(selectAll ? {} : { company_ids: selectedIds }),
				start_date: startDate,
				end_date: endDate,
				granularity,
			};

			await downloadCompanyReport({ ...baseRequest, format });
			onSuccess?.('Relatório gerado com sucesso!');
			resetReportForm();
			onClose();
		} catch (cause) {
			setError(reportErrorMessage(cause));
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<AppModal
			visible={visible}
			title="Gerar relatório"
			message={error ?? undefined}
			cancelLabel="Cancelar"
			confirmLabel="Gerar relatório"
			size="md"
			isLoading={isGenerating}
			confirmDisabled={isGenerating}
			onConfirm={() => void handleGenerate()}
			onClose={onClose}
		>
			<View className="gap-4">
				<View className="gap-1">
					<Text className="font-inter font-semibold text-gray-800 text-sm">
						Empresas
					</Text>
					<Text className="font-inter text-gray-500 text-xs">
						{selectedCount} empresa(s) selecionada(s)
					</Text>
				</View>

				<TextInput
					value={search}
					onChangeText={(value) => {
						setSearch(value);
						setIsCompanyPickerOpen(true);
					}}
					placeholder={selectAll ? 'Todas selecionadas' : 'Buscar empresa'}
					placeholderTextColor="#9CA3AF"
					accessibilityLabel="Buscar empresa"
					onFocus={() => setIsCompanyPickerOpen(true)}
					onPressIn={() => setIsCompanyPickerOpen(true)}
					numberOfLines={1}
					textAlignVertical="center"
					style={{ height: 44, lineHeight: 20, paddingVertical: 0 }}
					className="w-full min-w-0 rounded-lg border border-gray-300 px-3 font-inter text-gray-900 text-sm"
				/>

				{isCompanyPickerOpen &&
					(isLoadingCompanies ? (
						<View className="items-center py-4">
							<ActivityIndicator color="#1C6FB0" />
						</View>
					) : (
						<ScrollView
							className="max-h-64 rounded-lg border border-gray-200"
							style={{ maxHeight: 224 }}
							keyboardShouldPersistTaps="handled"
							nestedScrollEnabled
						>
							<View className="flex-row items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2.5">
								<TouchableOpacity
									onPress={toggleSelectAll}
									accessibilityRole="checkbox"
									accessibilityLabel="Selecionar todas as empresas"
									accessibilityState={{ checked: selectAll }}
									className="flex-row items-center gap-3"
								>
									<View
										className={`h-5 w-5 items-center justify-center rounded border ${selectAll ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}
									>
										{selectAll && <Check size={14} color="#FFFFFF" />}
									</View>
									<Text className="font-inter font-semibold text-gray-800 text-sm">
										Selecionar todas ({companies.length})
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={clearSelection}
									accessibilityRole="button"
								>
									<Text className="font-inter text-blue-600 text-sm">
										Limpar
									</Text>
								</TouchableOpacity>
							</View>
							{visibleCompanies.length === 0 ? (
								<Text className="p-3 font-inter text-gray-500 text-sm">
									Nenhuma empresa encontrada.
								</Text>
							) : (
								visibleCompanies.map((company) => {
									const isSelected = selectedIds.includes(company.id);
									return (
										<TouchableOpacity
											key={company.id}
											onPress={() => toggleCompany(company.id)}
											accessibilityRole="checkbox"
											accessibilityState={{ checked: isSelected }}
											activeOpacity={0.7}
											className={`flex-row items-center gap-3 rounded-md px-2 py-2.5 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
										>
											<View
												className={`h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}
											>
												{isSelected && <Check size={14} color="#FFFFFF" />}
											</View>
											<Text className="flex-1 font-inter text-gray-800 text-sm">
												{company.trade_name}
											</Text>
										</TouchableOpacity>
									);
								})
							)}
							<View className="flex-row items-center justify-between border-t border-gray-200 bg-white px-3 py-2.5">
								<Text className="font-inter text-gray-500 text-xs">
									{selectedCount} de {companies.length} selecionadas
								</Text>
								<TouchableOpacity
									onPress={() => setIsCompanyPickerOpen(false)}
									accessibilityRole="button"
								>
									<Text className="font-inter font-semibold text-blue-600 text-sm">
										Concluir
									</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					))}

				{selectedCompanies.length > 0 && !selectAll && (
					<View className="flex-row flex-wrap gap-2">
						{selectedCompanies.map((company) => (
							<View
								key={company.id}
								className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1.5"
							>
								<Text className="font-inter text-blue-800 text-xs">
									{company.trade_name}
								</Text>
								<TouchableOpacity
									accessibilityRole="button"
									accessibilityLabel={`Remover ${company.trade_name}`}
									onPress={() => toggleCompany(company.id)}
								>
									<X size={13} color="#1E40AF" />
								</TouchableOpacity>
							</View>
						))}
					</View>
				)}

				<View
					className="flex-col gap-3 md:flex-row"
					style={{ zIndex: openDate ? 20 : 1 }}
				>
					<View
						className="min-w-0 flex-1"
						style={{
							position: 'relative',
							zIndex: openDate === 'start' ? 30 : 1,
						}}
					>
						<DateField
							label="Data inicial"
							value={startDate}
							placeholder="Início"
							isOpen={openDate === 'start'}
							onOpenChange={(open) => setOpenDate(open ? 'start' : null)}
							onChangeText={setStartDate}
						/>
					</View>
					<View
						className="min-w-0 flex-1"
						style={{
							position: 'relative',
							zIndex: openDate === 'end' ? 30 : 1,
						}}
					>
						<DateField
							label="Data final"
							value={endDate}
							placeholder="Fim"
							minDate={startDate || undefined}
							isOpen={openDate === 'end'}
							onOpenChange={(open) => setOpenDate(open ? 'end' : null)}
							onChangeText={setEndDate}
						/>
					</View>
				</View>

				<SelectField
					label="Granularidade"
					value={granularity}
					allLabel="Selecione a granularidade"
					options={GRANULARITY_OPTIONS}
					searchable={false}
					onChange={(value) => setGranularity(value as typeof granularity)}
				/>
				<SelectField
					label="Formato"
					value={format}
					allLabel="Selecione o formato"
					options={FORMAT_OPTIONS}
					searchable={false}
					onChange={(value) => setFormat(value as ReportFormat)}
				/>

				{error && (
					<Text className="rounded-lg bg-red-50 p-3 font-inter text-red-700 text-sm">
						{error}
					</Text>
				)}
				{success && (
					<Text className="rounded-lg bg-green-50 p-3 font-inter text-green-700 text-sm">
						{success}
					</Text>
				)}
			</View>
		</AppModal>
	);
}
