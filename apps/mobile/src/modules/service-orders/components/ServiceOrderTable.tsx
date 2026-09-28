import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { ChevronRight, ClipboardList, Check } from 'lucide-react-native';
import type { Company } from '../../clients/types/company';
import type { ServiceOrder } from '../types/serviceOrder';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/format';

type ServiceOrderTableProps = {
	serviceOrders: ServiceOrder[];
	companiesById: Map<string, Company>;
	onSelectServiceOrder: (serviceOrder: ServiceOrder) => void;
	selectedIds: Set<string>;
	onToggleSelect: (id: string) => void;
	onToggleSelectAll: () => void;
};

function Checkbox({
	checked,
	onPress,
	accessibilityLabel,
}: {
	checked: boolean;
	onPress: () => void;
	accessibilityLabel: string;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			accessibilityLabel={accessibilityLabel}
			className={`h-[18px] w-[18px] items-center justify-center rounded border ${
				checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
			}`}
		>
			{checked && <Check size={12} color="#FFFFFF" />}
		</TouchableOpacity>
	);
}

export function ServiceOrderTable({
	serviceOrders,
	companiesById,
	onSelectServiceOrder,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
}: ServiceOrderTableProps) {
	const allSelected =
		serviceOrders.length > 0 &&
		serviceOrders.every((serviceOrder) => selectedIds.has(serviceOrder.id));

	return (
		<View className="bg-white">
			<View className="hidden h-11 flex-row items-center border-b border-gray-200 px-5 md:flex">
				<View className="w-10">
					<Checkbox
						checked={allSelected}
						onPress={onToggleSelectAll}
						accessibilityLabel="Selecionar todas"
					/>
				</View>

				<Text className="w-[26%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Projeto
				</Text>

				<Text className="w-[20%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Empresa
				</Text>

				<Text className="w-[12%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Itens
				</Text>

				<Text className="w-[14%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Prazo
				</Text>

				<Text className="w-[14%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Status
				</Text>

				<View className="w-8" />
			</View>

			<FlatList
				data={serviceOrders}
				keyExtractor={(serviceOrder) => serviceOrder.id}
				scrollEnabled={false}
				renderItem={({ item: serviceOrder }) => {
					const company = companiesById.get(serviceOrder.company_id);

					return (
						<View className="min-h-[70px] flex-row items-center border-b border-gray-100 px-4 py-4 md:px-5">
							<View className="w-10 items-start justify-center">
								<Checkbox
									checked={selectedIds.has(serviceOrder.id)}
									onPress={() => onToggleSelect(serviceOrder.id)}
									accessibilityLabel={`Selecionar ${serviceOrder.project_name}`}
								/>
							</View>

							<TouchableOpacity
								onPress={() => onSelectServiceOrder(serviceOrder)}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel={`Ver ordem de serviço ${serviceOrder.project_name}`}
								className="flex-1 flex-row items-center"
							>
								<View className="flex-1 md:w-[26%] md:flex-none md:pr-4">
									<Text
										className="font-inter font-semibold text-gray-900 text-sm"
										numberOfLines={1}
									>
										{serviceOrder.project_name}
									</Text>

									<Text
										className="mt-0.5 font-inter text-gray-400 text-xs md:hidden"
										numberOfLines={1}
									>
										{company?.trade_name ?? 'Empresa não encontrada'}
									</Text>
								</View>

								<View className="hidden w-[20%] min-w-0 flex-none pr-3 md:flex">
									<Text
										className="font-inter text-gray-600 text-sm"
										numberOfLines={1}
									>
										{company?.trade_name ?? 'Empresa não encontrada'}
									</Text>
								</View>

								<View className="hidden w-[12%] min-w-0 flex-none pr-3 md:flex">
									<Text className="font-inter text-gray-600 text-sm">
										{serviceOrder.items.length}
									</Text>
								</View>

								<View className="hidden w-[14%] min-w-0 flex-none pr-3 md:flex">
									<Text className="font-inter text-gray-600 text-sm">
										{formatDate(serviceOrder.deadline)}
									</Text>
								</View>

								<View className="hidden w-[14%] min-w-0 flex-none md:flex">
									<StatusBadge status={serviceOrder.status} />
								</View>

								<View className="w-8 items-end justify-center">
									<ChevronRight size={17} color="#9CA3AF" />
								</View>
							</TouchableOpacity>
						</View>
					);
				}}
				ListEmptyComponent={
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<ClipboardList size={18} color="#9CA3AF" />
						</View>

						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhuma ordem de serviço encontrada
						</Text>

						<Text className="mt-1 font-inter text-gray-400 text-xs">
							As ordens geradas a partir de orçamentos aparecerão aqui.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
