import { RefreshCw, Trash2 } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/format';
import type { ServiceOrder } from '../types/serviceOrder';

export type ServiceOrderView = 'detalhes' | 'workflow';

const viewOptions: { key: ServiceOrderView; label: string }[] = [
	{ key: 'detalhes', label: 'Detalhes' },
	{ key: 'workflow', label: 'Workflow' },
];

export function ServiceOrderDetailsHeader({
	serviceOrder,
	companyName,
	view,
	isLoading,
	onRefresh,
	onDelete,
	onViewChange,
}: {
	serviceOrder: ServiceOrder;
	companyName: string;
	view: ServiceOrderView;
	isLoading: boolean;
	onRefresh: () => void;
	onDelete: () => void;
	onViewChange: (view: ServiceOrderView) => void;
}) {
	return (
		<View className="flex-row flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-7">
			<View className="flex-1 min-w-[220px]">
				<View className="flex-row flex-wrap items-center gap-3">
					<Text className="font-inter font-bold text-gray-950 text-xl">
						{serviceOrder.project_name}
					</Text>
					<StatusBadge status={serviceOrder.status} />
				</View>
				<Text className="mt-1 font-inter text-gray-400 text-sm">
					{companyName}
				</Text>
				<View className="mt-4 flex-row flex-wrap gap-x-10 gap-y-3">
					<View className="gap-0.5">
						<Text className="font-inter text-gray-400 text-xs">Prazo</Text>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							{formatDate(serviceOrder.deadline)}
						</Text>
					</View>
					<View className="gap-0.5">
						<Text className="font-inter text-gray-400 text-xs">Itens</Text>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							{serviceOrder.items.length}
						</Text>
					</View>
				</View>
			</View>

			<View className="flex-row items-start gap-3 self-start">
				<TouchableOpacity
					onPress={onRefresh}
					disabled={isLoading}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel="Atualizar dados da ordem de serviço"
					className={`h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 ${isLoading ? 'opacity-60' : ''}`}
				>
					<RefreshCw size={16} color="#6B7280" />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={onDelete}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel="Excluir ordem de serviço"
					className="h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 hover:bg-red-100"
				>
					<Trash2 size={16} color="#791F1F" />
				</TouchableOpacity>
				<View className="flex-row gap-2 rounded-lg bg-gray-100 p-1">
					{viewOptions.map((option) => {
						const selected = option.key === view;
						return (
							<TouchableOpacity
								key={option.key}
								onPress={() => onViewChange(option.key)}
								activeOpacity={0.7}
								accessibilityRole="tab"
								accessibilityState={{ selected }}
								accessibilityLabel={`Ver ${option.label}`}
								className={`rounded-md px-4 py-2 ${selected ? 'bg-white shadow-sm' : ''}`}
							>
								<Text
									className={`font-inter text-sm ${selected ? 'font-semibold text-gray-900' : 'font-medium text-gray-500'}`}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						);
					})}
				</View>
			</View>
		</View>
	);
}

export type ServiceOrderDetailTab =
	'equipe' | 'cliente' | 'geral' | 'itens' | 'arquivos' | 'tradutores';

const detailTabOptions: { key: ServiceOrderDetailTab; label: string }[] = [
	{ key: 'geral', label: 'Geral' },
	{ key: 'equipe', label: 'Equipe' },
	{ key: 'tradutores', label: 'Tradutores' },
	{ key: 'cliente', label: 'Cliente' },
	{ key: 'itens', label: 'Itens' },
	{ key: 'arquivos', label: 'Arquivos' },
];

export function ServiceOrderDetailTabs({
	selected,
	onSelect,
}: {
	selected: ServiceOrderDetailTab;
	onSelect: (tab: ServiceOrderDetailTab) => void;
}) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="mt-5 border-b border-gray-200"
			contentContainerClassName="flex-row gap-7"
		>
			{detailTabOptions.map((tab) => {
				const active = tab.key === selected;
				return (
					<TouchableOpacity
						key={tab.key}
						onPress={() => onSelect(tab.key)}
						activeOpacity={0.7}
						accessibilityRole="tab"
						accessibilityState={{ selected: active }}
						accessibilityLabel={`Ver aba ${tab.label}`}
						className={`border-b-2 py-3 ${active ? 'border-blue-600' : 'border-transparent'}`}
					>
						<Text
							className={`font-inter text-sm ${active ? 'font-semibold text-blue-600' : 'font-medium text-gray-400'}`}
							numberOfLines={1}
						>
							{tab.label}
						</Text>
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}
