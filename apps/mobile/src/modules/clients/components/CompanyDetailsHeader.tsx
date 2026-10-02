import { Pencil, Trash2 } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Company } from '../types/company';
import { companyInitials } from '../utils/format';
import { StatusBadge } from './StatusBadge';
import { COMPANY_PROJECT_COUNT } from './CompanyDetailsProjectsTab';

type CompanyDetailsHeaderProps = {
	company: Company;
	contactCount: number;
	onEdit: () => void;
	onDelete: () => void;
};

export function CompanyDetailsHeader({
	company,
	contactCount,
	onEdit,
	onDelete,
}: CompanyDetailsHeaderProps) {
	return (
		<View className="border-b border-gray-200 pb-7">
			<View className="flex-col gap-6 md:flex-row md:items-center md:justify-between">
				<View className="flex-row items-center gap-4">
					<View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
						<Text className="font-inter font-bold text-gray-600 text-base">
							{companyInitials(company.trade_name)}
						</Text>
					</View>
					<View className="flex-1">
						<View className="flex-row flex-wrap items-center gap-2">
							<Text className="font-inter font-bold text-gray-950 text-xl">
								{company.trade_name}
							</Text>
							<StatusBadge isActive={company.is_active} />
						</View>
						<Text className="mt-1 font-inter text-gray-400 text-sm">
							{company.legal_name}
						</Text>
					</View>
				</View>

				<View className="flex-row flex-wrap items-center gap-5 self-start md:self-auto">
					<View className="flex-row items-center">
						<SummaryCount label="Funcionários" count={contactCount} />
						<View className="h-10 w-px bg-gray-200" />
						<SummaryCount label="Projetos" count={COMPANY_PROJECT_COUNT} />
					</View>
					<View className="flex-row items-center gap-2">
						<TouchableOpacity
							onPress={onEdit}
							activeOpacity={0.7}
							className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
						>
							<Pencil size={14} color="#353535" />
							<Text className="font-inter font-semibold text-gray-800 text-xs">
								Editar
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={onDelete}
							activeOpacity={0.7}
							className="flex-row items-center gap-1.5 rounded-lg border border-red-50 bg-red-50 px-3 py-2"
						>
							<Trash2 size={14} color="#791F1F" />
							<Text className="font-inter font-semibold text-red-900 text-xs">
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
			<Text className="font-inter font-bold text-gray-900 text-lg">
				{count}
			</Text>
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
		</View>
	);
}
