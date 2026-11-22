import { Pencil, Trash2 } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Company } from '../types/company';
import { companyInitials } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { COMPANY_PROJECT_COUNT } from './CompanyDetailsProjectsTab';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type CompanyDetailsHeaderProps = {
	company: Company;
	contactCount: number | null;
	onEdit: () => void;
	onDelete: () => void;
};

export function CompanyDetailsHeader({
	company,
	contactCount,
	onEdit,
	onDelete,
}: CompanyDetailsHeaderProps) {
	const themeColors = useThemeColors();
	const canWriteClients = usePermission('clients.write');
	const canReadProjects = usePermission('projects.read');

	return (
		<View className="border-b border-border pb-7">
			<View className="flex-col gap-6 md:flex-row md:items-center md:justify-between">
				<View className="flex-row items-center gap-4">
					<View className="h-14 w-14 items-center justify-center rounded-full bg-surface-muted">
						<Text className="font-inter font-bold text-foreground-secondary text-base">
							{companyInitials(company.trade_name)}
						</Text>
					</View>
					<View className="flex-1">
						<View className="flex-row flex-wrap items-center gap-2">
							<Text className="font-inter font-bold text-foreground text-xl">
								{company.trade_name}
							</Text>
							<StatusBadge isActive={company.is_active} />
						</View>
						<Text className="mt-1 font-inter text-foreground-subtle text-sm">
							{company.legal_name}
						</Text>
					</View>
				</View>

				<View className="flex-row flex-wrap items-center gap-5 self-start md:self-auto">
					<View className="flex-row items-center">
						{contactCount !== null && (
							<>
								<SummaryCount label="Funcionários" count={contactCount} />
								{canReadProjects && <View className="h-10 w-px bg-border" />}
							</>
						)}
						{canReadProjects && (
							<SummaryCount label="Projetos" count={COMPANY_PROJECT_COUNT} />
						)}
					</View>
					<View className="flex-row items-center gap-2">
						<TouchableOpacity
							onPress={onEdit}
							disabled={!canWriteClients}
							activeOpacity={0.7}
							className={`flex-row items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 ${!canWriteClients ? 'opacity-40' : ''}`}
						>
							<Pencil size={14} color={themeColors.foreground} />
							<Text className="font-inter font-semibold text-foreground text-xs">
								Editar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={onDelete}
							disabled={!canWriteClients}
							activeOpacity={0.7}
							className={`flex-row items-center gap-1.5 rounded-lg border border-danger-soft bg-danger-soft px-3 py-2 ${!canWriteClients ? 'opacity-40' : ''}`}
						>
							<Trash2 size={14} color={themeColors.dangerText} />
							<Text className="font-inter font-semibold text-danger-text text-xs">
								Excluir
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</View>
	);
}

function SummaryCount({ label, count }: { label: string; count: number }) {
	return (
		<View className="px-5">
			<Text className="font-inter font-bold text-foreground text-lg">
				{count}
			</Text>
			<Text className="font-inter text-foreground-subtle text-xs">{label}</Text>
		</View>
	);
}
