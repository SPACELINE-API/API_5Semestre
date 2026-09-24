import { useEffect, useMemo, useState } from 'react';

import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
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
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';
import { deleteCompany } from '../services/companyService';
import { exportCompaniesAsJson } from '../utils/export';

export function ClientsPage() {
	const router = useRouter();
	const { deleted } = useLocalSearchParams<{ deleted?: string }>();
	const isDesktop = useIsDesktop();

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [productFilter, setProductFilter] = useState('');

	const { companies, total, isLoading, error, create, removeMany } =
		useCompanies({
			name: search || undefined,
			status:
				statusFilter === 'all' ? undefined : statusFilter === 'active',
			product: productFilter || undefined,
		});

	const [isFormVisible, setIsFormVisible] = useState(false);

	const [showFilters, setShowFilters] = useState(false);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkDeleteConfirmVisible, setIsBulkDeleteConfirmVisible] =
		useState(false);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);

	const { toast, showToast } = useToast();

	useEffect(() => {
		if (deleted === '1') {
			showToast('Empresa excluída com sucesso!', 'success');
			router.setParams({ deleted: undefined });
		}
	}, [deleted]);

	// A pesquisa (nome, status, produto) já é feita pelo backend via useCompanies;
	// aqui só ordenamos o resultado atual para exibição (ativos primeiro).
	const sortedCompanies = useMemo(
		() =>
			[...companies].sort((a, b) => Number(b.is_active) - Number(a.is_active)),
		[companies],
	);

	const hasActiveFilters = statusFilter !== 'all' || productFilter.length > 0;

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
				sortedCompanies.length > 0 &&
				sortedCompanies.every((company) => current.has(company.id));

			if (allSelected) {
				const next = new Set(current);
				for (const company of sortedCompanies) next.delete(company.id);
				return next;
			}

			const next = new Set(current);
			for (const company of sortedCompanies) next.add(company.id);
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
						<View className="flex-row items-start justify-between gap-4 md:items-center">
							<View className="flex-1">
								<Text className="font-inter font-bold text-gray-950 text-2xl">
									Clientes
								</Text>

								<View className="mt-2 flex-row items-center gap-2">
									<Text className="font-inter text-gray-500 text-sm">
										{total} {total === 1 ? 'cliente' : 'clientes'}
									</Text>

									<View className="h-1 w-1 rounded-full bg-gray-300" />

									<Text className="font-inter text-gray-400 text-sm">
										{activeCompanies} ativos
									</Text>

									{inactiveCompanies > 0 && (
										<>
											<View className="h-1 w-1 rounded-full bg-gray-300" />

											<Text className="font-inter text-gray-400 text-sm">
												{inactiveCompanies} inativos
											</Text>
										</>
									)}
								</View>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Novo cliente"
								className={
									isDesktop
										? 'h-10 flex-row items-center justify-center gap-2 self-start rounded-lg bg-blue-300 px-4'
										: 'h-11 w-11 items-center justify-center self-start rounded-full bg-blue-300'
								}
							>
								<Plus size={isDesktop ? 16 : 20} color="#042C53" />

								{isDesktop && (
									<Text className="font-inter font-semibold text-blue-900 text-sm">
										Novo cliente
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>

					<View className="gap-3">
						<View className="flex-row items-center gap-3">
							<View className="h-10 flex-1 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
								<Search size={17} color="#9CA3AF" />

								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder="Buscar por nome, CNPJ..."
									placeholderTextColor="#9CA3AF"
									className="ml-2 flex-1 border-0 font-inter text-gray-800 text-sm outline-none"
								/>

								{search.length > 0 && (
									<TouchableOpacity
										onPress={() => setSearch('')}
										activeOpacity={0.7}
									>
										<X size={15} color="#9CA3AF" />
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

						<View className="flex-row items-center justify-between">
							<Text className="font-inter text-gray-400 text-xs">
								{total} {total === 1 ? 'resultado' : 'resultados'}
							</Text>

							{selectedIds.size > 0 && (
								<View className="flex-row items-center gap-3 rounded-lg bg-blue-50 px-3 py-2">
									<Text className="font-inter font-semibold text-blue-900 text-xs">
										{selectedIds.size}{' '}
										{selectedIds.size === 1 ? 'selecionada' : 'selecionadas'}
									</Text>

									<TouchableOpacity
										onPress={handleExportSelected}
										activeOpacity={0.7}
										className="flex-row items-center gap-1.5"
									>
										<Download size={14} color="#1C6FB0" />
										<Text className="font-inter font-semibold text-blue-600 text-xs">
											Exportar JSON
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setIsBulkDeleteConfirmVisible(true)}
										activeOpacity={0.7}
										className="flex-row items-center gap-1.5"
									>
										<Trash2 size={14} color="#791F1F" />
										<Text className="font-inter font-semibold text-red-900 text-xs">
											Excluir
										</Text>
									</TouchableOpacity>

									<TouchableOpacity
										onPress={() => setSelectedIds(new Set())}
										activeOpacity={0.7}
									>
										<X size={14} color="#6B7280" />
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>

					{isLoading && (
						<View className="items-center justify-center border-t border-gray-100 py-16">
							<ActivityIndicator color="#6B7280" />

							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando clientes...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />

								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar os clientes
								</Text>
							</View>

							<Text className="mt-1 font-inter text-gray-500 text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-gray-200">
							<CompanyTable
								companies={sortedCompanies}
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

						<CompanyFilters
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
							productFilter={productFilter}
							onProductFilterChange={setProductFilter}
						/>

						{hasActiveFilters && (
							<TouchableOpacity
								onPress={() => {
									setStatusFilter('all');
									setProductFilter('');
								}}
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
