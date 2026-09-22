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
	AlertCircle,
	Search,
	X,
	Download,
	Trash2,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useServiceOrders } from '../hooks/useServiceOrders';
import { useCompanies } from '../../clients/hooks/useCompanies';
import { useContacts } from '../hooks/useContacts';
import { ServiceOrderTable } from '../components/ServiceOrderTable';
import { GenerateOrderModal } from '../components/GenerateOrderModal';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';
import { deleteServiceOrder } from '../services/serviceOrderService';
import { exportServiceOrdersAsJson } from '../utils/export';

export function ServiceOrdersPage() {
	const router = useRouter();
	const { deleted } = useLocalSearchParams<{ deleted?: string }>();
	const isDesktop = useIsDesktop();

	const { serviceOrders, isLoading, error, create, removeMany } =
		useServiceOrders();
	const { companies } = useCompanies();
	const { contacts } = useContacts();

	const [isFormVisible, setIsFormVisible] = useState(false);
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isBulkDeleteConfirmVisible, setIsBulkDeleteConfirmVisible] =
		useState(false);
	const [isBulkDeleting, setIsBulkDeleting] = useState(false);
	const { toast, showToast } = useToast();

	useEffect(() => {
		if (deleted === '1') {
			showToast('Ordem de serviço excluída com sucesso!', 'success');
			router.setParams({ deleted: undefined });
		}
	}, [deleted]);

	const companiesById = useMemo(
		() => new Map(companies.map((company) => [company.id, company])),
		[companies],
	);

	const filteredServiceOrders = useMemo(() => {
		const normalizedSearch = search.toLowerCase().trim();
		if (!normalizedSearch) return serviceOrders;

		return serviceOrders.filter((serviceOrder) => {
			const company = companiesById.get(serviceOrder.company_id);
			return (
				serviceOrder.project_name.toLowerCase().includes(normalizedSearch) ||
				company?.trade_name?.toLowerCase().includes(normalizedSearch)
			);
		});
	}, [serviceOrders, search, companiesById]);

	const selectedServiceOrders = serviceOrders.filter((serviceOrder) =>
		selectedIds.has(serviceOrder.id),
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
				filteredServiceOrders.length > 0 &&
				filteredServiceOrders.every((serviceOrder) =>
					current.has(serviceOrder.id),
				);

			if (allSelected) {
				const next = new Set(current);
				for (const serviceOrder of filteredServiceOrders) {
					next.delete(serviceOrder.id);
				}
				return next;
			}

			const next = new Set(current);
			for (const serviceOrder of filteredServiceOrders) {
				next.add(serviceOrder.id);
			}
			return next;
		});
	}

	function handleExportSelected() {
		const exported = exportServiceOrdersAsJson(selectedServiceOrders);
		if (exported) {
			showToast(
				`${selectedServiceOrders.length} ${
					selectedServiceOrders.length === 1
						? 'ordem exportada'
						: 'ordens exportadas'
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
				selectedServiceOrders.map((serviceOrder) =>
					deleteServiceOrder(serviceOrder.id),
				),
			);
			removeMany(selectedServiceOrders.map((serviceOrder) => serviceOrder.id));
			setSelectedIds(new Set());
			setIsBulkDeleteConfirmVisible(false);
			showToast('Ordens de serviço excluídas com sucesso!', 'success');
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir as ordens selecionadas.',
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
					<View>
						<View className="flex-row items-start justify-between gap-4 md:items-center">
							<View className="flex-1">
								<Text className="font-inter font-bold text-gray-950 text-2xl">
									Ordens de Serviço
								</Text>

								<Text className="mt-2 font-inter text-gray-500 text-sm">
									{serviceOrders.length}{' '}
									{serviceOrders.length === 1 ? 'ordem' : 'ordens'}
								</Text>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Gerar ordem de serviço a partir de um orçamento"
								className={
									isDesktop
										? 'h-10 flex-row items-center justify-center gap-2 self-start rounded-lg bg-blue-300 px-4'
										: 'h-11 w-11 items-center justify-center self-start rounded-full bg-blue-300'
								}
							>
								<Plus size={isDesktop ? 16 : 20} color="#042C53" />

								{isDesktop && (
									<Text className="font-inter font-semibold text-blue-900 text-sm">
										Gerar ordem de serviço
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>

					<View className="gap-3">
						<View className="h-10 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
							<Search size={17} color="#9CA3AF" />

							<TextInput
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar por projeto, empresa..."
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

						<View className="flex-row items-center justify-between">
							<Text className="font-inter text-gray-400 text-xs">
								{filteredServiceOrders.length}{' '}
								{filteredServiceOrders.length === 1
									? 'resultado'
									: 'resultados'}
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
								Carregando ordens de serviço...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />

								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar as ordens de serviço
								</Text>
							</View>

							<Text className="mt-1 font-inter text-gray-500 text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-gray-200">
							<ServiceOrderTable
								serviceOrders={filteredServiceOrders}
								companiesById={companiesById}
								onSelectServiceOrder={(serviceOrder) =>
									router.push({
										pathname: '/ordens-de-servico/[id]',
										params: { id: serviceOrder.id },
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

			<GenerateOrderModal
				visible={isFormVisible}
				companies={companies}
				contacts={contacts}
				onClose={() => setIsFormVisible(false)}
				onSubmit={async (data) => {
					try {
						await create(data);
						setIsFormVisible(false);
						showToast('Ordem de serviço gerada com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível gerar a ordem de serviço.',
							'error',
						);
						throw submitError;
					}
				}}
				toast={toast}
			/>

			<ConfirmDialog
				visible={isBulkDeleteConfirmVisible}
				title="Excluir ordens de serviço selecionadas"
				message={`Tem certeza que deseja excluir ${selectedIds.size} ${
					selectedIds.size === 1 ? 'ordem de serviço' : 'ordens de serviço'
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
		</View>
	);
}
