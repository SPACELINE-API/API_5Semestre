import { CheckCheck, Trash2 } from 'lucide-react-native';
import {
	Platform,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { StatusBadge } from './StatusBadge';
import { formatDeadline } from '../utils/format';
import type { ServiceOrder } from '../types/serviceOrder';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export type ServiceOrderView = 'detalhes' | 'workflow';

const viewOptions: { key: ServiceOrderView; label: string }[] = [
	{ key: 'detalhes', label: 'Detalhes' },
	{ key: 'workflow', label: 'Workflow' },
];

export function ServiceOrderDetailsHeader({
	serviceOrder,
	companyName,
	view,
	onDelete,
	canComplete,
	onComplete,
	onViewChange,
}: {
	serviceOrder: ServiceOrder;
	companyName: string;
	view: ServiceOrderView;
	onDelete: () => void;
	canComplete: boolean;
	onComplete: () => void;
	onViewChange: (view: ServiceOrderView) => void;
}) {
	const themeColors = useThemeColors();
	const canWriteServiceOrders = usePermission('service_orders.write');

	return (
		<View className="flex-row flex-wrap items-start justify-between gap-4 border-b border-border pb-7">
			<View className="flex-1 min-w-[220px]">
				<View className="flex-row flex-wrap items-center gap-3">
					<Text className="font-inter font-bold text-foreground text-xl">
						{serviceOrder.project_name}
					</Text>
					<StatusBadge status={serviceOrder.status} />
					{serviceOrder.revised_after_reopen ? (
						<View className="rounded-full bg-warning-soft px-2.5 py-1">
							<Text className="font-inter font-medium text-warning-text text-xs">
								Versão {serviceOrder.current_version} · revisada após reabertura
								do orçamento
							</Text>
						</View>
					) : null}
				</View>
				<Text className="mt-1 font-inter text-foreground-subtle text-sm">
					{companyName}
				</Text>
				<View className="mt-4 flex-row flex-wrap gap-x-10 gap-y-3">
					<View className="gap-0.5">
						<Text className="font-inter text-foreground-subtle text-xs">
							Prazo
						</Text>
						<Text className="font-inter font-medium text-foreground text-sm">
							{formatDeadline(serviceOrder.deadline)}
						</Text>
					</View>
					<View className="gap-0.5">
						<Text className="font-inter text-foreground-subtle text-xs">
							Origem
						</Text>
						<Text className="font-inter font-medium text-foreground text-sm">
							{serviceOrder.quote_id
								? 'Orçamento aprovado'
								: 'Criada manualmente'}
						</Text>
					</View>
					<View className="gap-0.5">
						<Text className="font-inter text-foreground-subtle text-xs">
							Itens
						</Text>
						<Text className="font-inter font-medium text-foreground text-sm">
							{serviceOrder.items.length}
						</Text>
					</View>
				</View>
			</View>

			<View className="flex-row flex-wrap items-start gap-3 self-start md:flex-nowrap">
				{canComplete && (
					<TouchableOpacity
						onPress={onComplete}
						disabled={!canWriteServiceOrders}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel="Concluir Ordem de Serviço"
						className={`flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2.5 ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
					>
						<CheckCheck size={16} color={themeColors.primaryForeground} />
						<Text className="font-inter font-semibold text-primary-foreground text-xs">
							Concluir Ordem de Serviço
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					onPress={onDelete}
					disabled={!canWriteServiceOrders}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel="Excluir ordem de serviço"
					className={`h-9 w-9 items-center justify-center rounded-lg border border-danger/25 bg-danger-soft hover:bg-danger-soft ${!canWriteServiceOrders ? 'opacity-40' : ''}`}
				>
					<Trash2 size={16} color={themeColors.dangerText} />
				</TouchableOpacity>
				<View
					className={`flex-row gap-2 rounded-lg bg-surface-muted p-1 ${Platform.OS === 'web' ? '' : 'hidden'}`}
				>
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
								className={`rounded-md px-4 py-2 ${selected ? 'bg-surface shadow-sm' : ''}`}
							>
								<Text
									className={`font-inter text-sm ${selected ? 'font-semibold text-foreground' : 'font-medium text-foreground-muted'}`}
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
	| 'equipe'
	| 'cliente'
	| 'geral'
	| 'itens'
	| 'adicionais'
	| 'revisao'
	| 'arquivos'
	| 'tradutores'
	| 'versoes';

const detailTabOptions: { key: ServiceOrderDetailTab; label: string }[] = [
	{ key: 'geral', label: 'Geral' },
	{ key: 'equipe', label: 'Equipe' },
	{ key: 'tradutores', label: 'Tradutores' },
	{ key: 'cliente', label: 'Cliente' },
	{ key: 'itens', label: 'Itens' },
	{ key: 'adicionais', label: 'Serviços adicionais' },
	{ key: 'revisao', label: 'Revisão' },
	{ key: 'arquivos', label: 'Arquivos' },
	{ key: 'versoes', label: 'Versões' },
];

export function ServiceOrderDetailTabs({
	selected,
	onSelect,
	reviewCount = 0,
	showVersions = false,
}: {
	selected: ServiceOrderDetailTab;
	onSelect: (tab: ServiceOrderDetailTab) => void;
	reviewCount?: number;
	showVersions?: boolean;
}) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			className="mt-5 border-b border-border"
			contentContainerClassName="flex-row gap-7"
		>
			{detailTabOptions
				.filter((tab) => showVersions || tab.key !== 'versoes')
				.map((tab) => {
					const active = tab.key === selected;
					return (
						<TouchableOpacity
							key={tab.key}
							onPress={() => onSelect(tab.key)}
							activeOpacity={0.7}
							accessibilityRole="tab"
							accessibilityState={{ selected: active }}
							accessibilityLabel={`Ver aba ${tab.label}`}
							className={`border-b-2 py-3 ${active ? 'border-primary' : 'border-transparent'}`}
						>
							<View className="flex-row items-center gap-1.5">
								<Text
									className={`font-inter text-sm ${active ? 'font-semibold text-primary-text' : 'font-medium text-foreground-subtle'}`}
									numberOfLines={1}
								>
									{tab.label}
								</Text>
								{tab.key === 'revisao' && reviewCount > 0 && (
									<View className="min-w-[18px] items-center rounded-full bg-warning-soft px-1.5 py-0.5">
										<Text className="font-inter font-semibold text-warning-text text-xs">
											{reviewCount}
										</Text>
									</View>
								)}
							</View>
						</TouchableOpacity>
					);
				})}
		</ScrollView>
	);
}
