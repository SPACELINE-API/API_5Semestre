import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Company } from '../types/company';
import { StatusBadge } from './StatusBadge';
import { companyInitials, formatCnpj } from '../utils/format';

type CompanyRowProps = {
	company: Company;
	onPress?: (company: Company) => void;
};

export function CompanyRow({ company, onPress }: CompanyRowProps) {
	return (
		<TouchableOpacity
			onPress={() => onPress?.(company)}
			className="flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:gap-0 md:py-3"
		>
			<View className="flex-row items-center gap-3 md:w-[28%] md:pr-3">
				<View className="h-9 w-9 items-center justify-center rounded-full bg-blue-50">
					<Text className="font-inter font-bold text-blue-900 text-xs">
						{companyInitials(company.trade_name)}
					</Text>
				</View>
				<View className="flex-1">
					<Text
						className="font-inter font-semibold text-gray-900 text-sm"
						numberOfLines={1}
					>
						{company.trade_name}
					</Text>
					<Text className="font-inter text-gray-500 text-xs" numberOfLines={1}>
						{company.legal_name}
					</Text>
				</View>
			</View>

			<View className="md:w-[16%] md:pr-3">
				<Text className="font-inter text-gray-800 text-sm" numberOfLines={1}>
					{formatCnpj(company.cnpj)}
				</Text>
			</View>

			<View className="md:w-[24%] md:pr-3">
				<Text className="font-inter text-gray-800 text-sm" numberOfLines={1}>
					{company.email}
				</Text>
				<Text className="font-inter text-gray-500 text-xs" numberOfLines={1}>
					{company.phone}
				</Text>
			</View>

			<View className="md:w-[16%] md:pr-3">
				<Text className="font-inter text-gray-800 text-sm" numberOfLines={1}>
					{company.industry}
				</Text>
			</View>

			<View className="flex-row items-center justify-between md:w-[16%]">
				<StatusBadge isActive={company.is_active} />
				<ChevronRight size={18} color="#8A8A8A" />
			</View>
		</TouchableOpacity>
	);
}
