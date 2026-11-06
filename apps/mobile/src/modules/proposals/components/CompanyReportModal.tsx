import { useEffect, useMemo, useRef, useState } from 'react';
import {
	ActivityIndicator,
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
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error && error.message) return error.message;
	return 'Não foi possível gerar o relatório. Tente novamente.';
}

export function CompanyReportModal({
	visible,
	onClose,
}: {
	visible: boolean;
	onClose: () => void;
}) {
	const [companies, setCompanies] = useState<ReportCompanyOption[]>([]);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectAll, setSelectAll] = useState(false);
	const [search, setSearch] = useState('');
	const [isCompanyPickerOpen, setIsCompanyPickerOpen] = useState(false);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');
	const [openDate, setOpenDate] = useState<'start' | 'end' | null>(null);
	const [granularity, setGranularity] = useState<'days' | 'months' | 'years'>(
		'months',
	);
	const [format, setFormat] = useState<ReportFormat>('xlsx');
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
		setGranularity('months');
		setFormat('xlsx');
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
		setIsCompanyPickerOpen(false);
	}

	function toggleSelectAll() {
		setSelectAll((current) => !current);
		setSelectedIds([]);
		setIsCompanyPickerOpen(false);
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
		if (startDate > endDate) {
			setError('A data inicial não pode ser posterior à data final.');
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

				<TouchableOpacity
					onPress={toggleSelectAll}
					accessibilityRole="checkbox"
					accessibilityState={{ checked: selectAll }}
					className={`flex-row items-center gap-2 rounded-lg border px-3 py-2.5 ${selectAll ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-transparent'}`}
				>
					<View
						className={`h-5 w-5 items-center justify-center rounded border ${selectAll ? 'border-blue-600 bg-blue-600' : 'border-gray-400 bg-white'}`}
					>
						{selectAll && <Check size={14} color="#FFFFFF" />}
					</View>
					<Text
						className={`font-inter font-medium text-sm ${selectAll ? 'text-blue-800' : 'text-gray-800'}`}
					>
						Selecionar todas as empresas
					</Text>
				</TouchableOpacity>

				<TextInput
					value={search}
					onChangeText={(value) => {
						setSearch(value);
						setIsCompanyPickerOpen(true);
					}}
					placeholder="Buscar empresa"
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
						<View className="max-h-44 gap-1 overflow-hidden rounded-lg border border-gray-200 p-1">
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
											className="flex-row items-center justify-between rounded-md px-2 py-2 hover:bg-gray-50"
										>
											<Text className="flex-1 font-inter text-gray-800 text-sm">
												{company.trade_name}
											</Text>
											{isSelected && <Check size={17} color="#1C6FB0" />}
										</TouchableOpacity>
									);
								})
							)}
						</View>
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
