import { useEffect, useMemo, useState } from 'react';

import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	useWindowDimensions,
} from 'react-native';

import {
	Plus,
	Search,
	SlidersHorizontal,
	AlertCircle,
	X,
	Download,
	Trash2,
} from 'lucide-react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCompanies } from '../hooks/useCompanies';

import {
	CompanyFilters,
	type StatusFilter,
} from '../components/CompanyFilters';

import { CompanyTable } from '../components/CompanyTable';

import { CompanyFormModal } from '../components/CompanyFormModal';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { deleteCompany } from '../services/companyService';
import { exportCompaniesAsJson } from '../utils/export';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function ClientsPage() {
	const themeColors = useThemeColors();
	const { width } = useWindowDimensions();
	const router = useRouter();
	const { deleted } = useLocalSearchParams<{ deleted?: string }>();
	const { companies, isLoading, error, create, removeMany } = useCompanies();

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

	const [isFormVisible, setIsFormVisible] = useState(false);

	const [showFilters, setShowFilters] = useState(false);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkDeleteConfirmVisible, setIsBulkDeleteConfirmVisible] =
		useState(false);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);

	const { toast, showToast } = useToast();
	const canWriteClients = usePermission('clients.write');

	useEffect(() => {
		if (deleted === '1') {
			showToast('Empresa excluída com sucesso!', 'success');
			router.setParams({ deleted: undefined });
		}
	}, [deleted]);

	const filteredCompanies = useMemo(() => {
		const normalizedSearch = search.toLowerCase().trim();

		return companies
			.filter((company) => {
				const matchesSearch =
					!normalizedSearch ||
					company.trade_name?.toLowerCase().includes(normalizedSearch) ||
					company.legal_name?.toLowerCase().includes(normalizedSearch) ||
					company.cnpj?.toLowerCase().includes(normalizedSearch);

				const matchesStatus =
					statusFilter === 'all' ||
					(statusFilter === 'active' ? company.is_active : !company.is_active);

				return matchesSearch && matchesStatus;
			})
			.sort((a, b) => Number(b.is_active) - Number(a.is_active));
	}, [companies, search, statusFilter]);

	const activeCompanies = companies.filter(
		(company) => company.is_active,
	).length;

	const inactiveCompanies = companies.length - activeCompanies;

	const selectedCompanies = companies.filter((company) =>
		selectedIds.has(company.id),
	);

	function toggleSelect(id: string) {
		setSelectedIds((current) => {
			const next = new Set(current);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}

	function toggleSelectAll() {
		setSelectedIds((current) => {
			const allSelected =
				filteredCompanies.length > 0 &&
				filteredCompanies.every((company) => current.has(company.id));

			if (allSelected) {
				const next = new Set(current);
				for (const company of filteredCompanies) next.delete(company.id);
				return next;
			}

			const next = new Set(current);
			for (const company of filteredCompanies) next.add(company.id);
			return next;
		});
	}

	function handleExportSelected() {
		const exported = exportCompaniesAsJson(selectedCompanies);
		if (exported) {
			showToast(
				`${selectedCompanies.length} ${
					selectedCompanies.length === 1
						? 'empresa exportada'
						: 'empresas exportadas'
				} em JSON.`,
				'success',
			);
		} else {
			showToast('Exportação disponível apenas na versão web.', 'error');
		}
	}

	async function handleBulkDelete() {
		setIsBulkDeleting(true);

		try {
			await Promise.all(
				selectedCompanies.map((company) => deleteCompany(company.id)),
			);
			removeMany(selectedCompanies.map((company) => company.id));
			setSelectedIds(new Set());
			setIsBulkDeleteConfirmVisible(false);
			showToast('Empresas excluídas com sucesso!', 'success');
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir as empresas selecionadas.',
				'error',
			);
		} finally {
			setIsBulkDeleting(false);
		}
	}

	return (
		<View className="relative flex-1 bg-surface">
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
					<View className="border-b border-border pb-6">
						<View className="flex-row flex-wrap items-start justify-between gap-4 md:items-center">
							<View className="flex-1">
								<Text className="font-inter font-bold text-foreground text-2xl">
									Clientes
								</Text>

								<View className="mt-2 flex-row items-center gap-2">
									<Text className="font-inter text-foreground-muted text-sm">
										{companies.length}{' '}
										{companies.length === 1 ? 'cliente' : 'clientes'}
									</Text>

									<View className="h-1 w-1 rounded-full bg-border-strong" />

									<Text className="font-inter text-foreground-subtle text-sm">
										{activeCompanies} ativos
									</Text>

									{inactiveCompanies > 0 && (
										<>
											<View className="h-1 w-1 rounded-full bg-border-strong" />

											<Text className="font-inter text-foreground-subtle text-sm">
												{inactiveCompanies} inativos
											</Text>
										</>
									)}
								</View>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								disabled={!canWriteClients}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Novo cliente"
								className={`shrink-0 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 ${!canWriteClients ? 'opacity-40' : ''}`}
							>
								<Plus size={18} color={themeColors.primaryForeground} />
								<Text className="font-inter-medium text-sm text-primary-foreground">
									Novo cliente
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					<View className="gap-3">
						<View className="flex-row items-center gap-3">
							<View className="h-10 flex-1 flex-row items-center rounded-lg border border-border bg-surface px-3">
								<Search size={17} color={themeColors.foregroundSubtle} />

								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder={
										width < 768
											? 'Buscar nome ou CNPJ'
											: 'Buscar por nome, CNPJ...'
									}
									placeholderTextColor={themeColors.foregroundSubtle}
									className="ml-2 flex-1 border-0 font-inter text-foreground text-sm outline-none max-md:min-w-0 max-md:shrink h-10"
								/>

								{search.length > 0 && (
									<TouchableOpacity
										onPress={() => setSearch('')}
										activeOpacity={0.7}
									>
										<X size={15} color={themeColors.foregroundSubtle} />
									</TouchableOpacity>
								)}
							</View>

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
										showFilters || statusFilter !== 'all'
											? 'border-primary/40 bg-primary-soft'
											: 'border-border bg-surface'
									}
								`}
							>
								<SlidersHorizontal
									size={16}
									color={
										showFilters || statusFilter !== 'all'
											? themeColors.primaryText
											: themeColors.foregroundMuted
									}
								/>

								<Text
									className={`font-inter font-medium text-sm ${
										showFilters || statusFilter !== 'all'
											? 'text-primary-strong'
											: 'text-foreground-secondary'
									}`}
								>
									Filtros
								</Text>

								{statusFilter !== 'all' && (
									<View className="h-1.5 w-1.5 rounded-full bg-primary" />
								)}
							</TouchableOpacity>
						</View>

						<View className="flex-row items-center justify-between">
							<Text className="font-inter text-foreground-subtle text-xs">
								{filteredCompanies.length}{' '}
								{filteredCompanies.length === 1 ? 'resultado' : 'resultados'}
							</Text>

							{selectedIds.size > 0 && (
								<View className="flex-row items-center gap-3 rounded-lg bg-primary-soft px-3 py-2">
									<Text className="font-inter font-semibold text-primary-strong text-xs">
										{selectedIds.size}{' '}
										{selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
									</Text>

									<TouchableOpacity
										onPress={handleExportSelected}
										activeOpacity={0.7}
										className="flex-row items-center gap-1.5"
									>
										<Download size={14} color={themeColors.primary} />
										<Text className="font-inter font-semibold text-primary-text text-xs">
											Exportar JSON
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setIsBulkDeleteConfirmVisible(true)}
										disabled={!canWriteClients}
										activeOpacity={0.7}
										className={`flex-row items-center gap-1.5 ${!canWriteClients ? 'opacity-40' : ''}`}
									>
										<Trash2 size={14} color={themeColors.dangerText} />
										<Text className="font-inter font-semibold text-danger-text text-xs">
											Excluir
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setSelectedIds(new Set())}
										activeOpacity={0.7}
									>
										<X size={14} color={themeColors.foregroundMuted} />
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>

					{isLoading && (
						<View className="items-center justify-center border-t border-border-subtle py-16">
							<ActivityIndicator color={themeColors.foregroundMuted} />

							<Text className="mt-3 font-inter text-foreground-subtle text-sm">
								Carregando clientes...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-border-subtle py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color={themeColors.danger} />

								<Text className="font-inter font-semibold text-danger text-sm">
									Não foi possível carregar os clientes
								</Text>
							</View>

							<Text className="mt-1 font-inter text-foreground-muted text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-border">
							<CompanyTable
								companies={filteredCompanies}
								onSelectCompany={(company) =>
									router.push({
										pathname: '/clientes/[id]',
										params: {
											id: company.id,
										},
									})
								}
								selectedIds={selectedIds}
								onToggleSelect={toggleSelect}
								onToggleSelectAll={toggleSelectAll}
							/>
						</View>
					)}
				</View>
			</ScrollView>

			<CompanyFormModal
				visible={isFormVisible}
				onClose={() => setIsFormVisible(false)}
				onSubmit={async (data) => {
					try {
						await create(data);
						setIsFormVisible(false);
						showToast('Empresa cadastrada com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível cadastrar a empresa.',
							'error',
						);
						throw submitError;
					}
				}}
				toast={toast}
			/>

			<ConfirmDialog
				visible={isBulkDeleteConfirmVisible}
				title="Excluir empresas selecionadas"
				message={`Tem certeza que deseja excluir ${selectedIds.size} ${
					selectedIds.size === 1 ? 'empresa' : 'empresas'
				}? Essa ação não pode ser desfeita.`}
				confirmLabel="Excluir"
				destructive
				isLoading={isBulkDeleting}
				onConfirm={handleBulkDelete}
				onCancel={() => setIsBulkDeleteConfirmVisible(false)}
			/>

			<Toast
				toast={isFormVisible || isBulkDeleteConfirmVisible ? null : toast}
			/>

			{showFilters && (
				<>
					<TouchableOpacity
						activeOpacity={1}
						onPress={() => setShowFilters(false)}
						className="absolute inset-0 z-10 bg-overlay/10"
					/>

					<View className="absolute bottom-0 right-0 top-0 z-20 w-[300px] gap-5 border-l border-border bg-surface p-5 shadow-xl">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-foreground text-base">
								Filtros
							</Text>

							<TouchableOpacity
								onPress={() => setShowFilters(false)}
								activeOpacity={0.7}
							>
								<X size={18} color={themeColors.foregroundMuted} />
							</TouchableOpacity>
						</View>

						<CompanyFilters
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
						/>

						{statusFilter !== 'all' && (
							<TouchableOpacity
								onPress={() => setStatusFilter('all')}
								activeOpacity={0.7}
								className="self-start"
							>
								<Text className="font-inter font-semibold text-primary-text text-sm">
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
