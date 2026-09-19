import { View, Text, FlatList, TouchableOpacity } from 'react-native';

import { ChevronRight, Building2, Check } from 'lucide-react-native';

import type { Company } from '../types/company';

import { companyInitials, formatCnpj } from '../utils/format';

type CompanyTableProps = {
	companies: Company[];
	onSelectCompany?: (company: Company) => void;
	selectedIds: Set<string>;
	onToggleSelect: (id: string) => void;
	onToggleSelectAll: () => void;
};

function Checkbox({
	checked,
	onPress,
}: {
	checked: boolean;
	onPress: () => void;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			className={`h-[18px] w-[18px] items-center justify-center rounded border ${
				checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
			}`}
		>
			{checked && <Check size={12} color="#FFFFFF" />}
		</TouchableOpacity>
	);
}

export function CompanyTable({
	companies,
	onSelectCompany,
	selectedIds,
	onToggleSelect,
	onToggleSelectAll,
}: CompanyTableProps) {
	const allSelected =
		companies.length > 0 &&
		companies.every((company) => selectedIds.has(company.id));

	return (
		<View className="bg-white">
			<View className="hidden h-11 flex-row items-center border-b border-gray-200 px-5 md:flex">
				<View className="w-10">
					<Checkbox checked={allSelected} onPress={onToggleSelectAll} />
				</View>

				<Text className="w-[26%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Empresa
				</Text>

				<Text className="w-[16%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					CNPJ
				</Text>

				<Text className="w-[24%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Contato
				</Text>

				<Text className="w-[14%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Área
				</Text>

				<Text className="w-[10%] font-inter font-medium text-[11px] uppercase tracking-wide text-gray-400">
					Status
				</Text>

				<View className="w-8" />
			</View>

			<FlatList
				data={companies}
				keyExtractor={(company) => company.id}
				scrollEnabled={false}
				renderItem={({ item: company }) => (
					<View className="min-h-[78px] flex-row items-center border-b border-gray-100 px-4 py-4 md:px-5">
						<View className="w-10 items-start justify-center">
							<Checkbox
								checked={selectedIds.has(company.id)}
								onPress={() => onToggleSelect(company.id)}
							/>
						</View>

						<TouchableOpacity
							onPress={() => onSelectCompany?.(company)}
							activeOpacity={0.7}
							className="flex-1 flex-row items-center"
						>
							<View className="flex-1 flex-row items-center gap-3 md:w-[26%] md:flex-none md:pr-4">
								<View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
									{company.trade_name ? (
										<Text className="font-inter font-semibold text-gray-600 text-xs">
											{companyInitials(company.trade_name)}
										</Text>
									) : (
										<Building2 size={17} color="#9CA3AF" />
									)}
								</View>

								<View className="min-w-0 flex-1">
									<Text
										className="font-inter font-semibold text-gray-900 text-sm"
										numberOfLines={1}
									>
										{company.trade_name}
									</Text>

									<Text
										className="mt-0.5 font-inter text-gray-400 text-xs"
										numberOfLines={1}
									>
										{company.legal_name}
									</Text>
								</View>
							</View>

							<View className="hidden w-[16%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-gray-600 text-sm"
									numberOfLines={1}
								>
									{formatCnpj(company.cnpj)}
								</Text>
							</View>

							<View className="hidden w-[24%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-gray-700 text-sm"
									numberOfLines={1}
								>
									{company.email || 'Não informado'}
								</Text>

								{company.phone && (
									<Text
										className="mt-0.5 font-inter text-gray-400 text-xs"
										numberOfLines={1}
									>
										{company.phone}
									</Text>
								)}
							</View>

							<View className="hidden w-[14%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-gray-600 text-sm"
									numberOfLines={1}
								>
									{company.industry || 'Não informado'}
								</Text>
							</View>

							<View className="hidden w-[10%] min-w-0 flex-none md:flex">
								<View
									className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${
										company.is_active ? 'bg-gray-100' : 'bg-gray-50'
									}`}
								>
									<View
										className={`h-1.5 w-1.5 rounded-full ${
											company.is_active ? 'bg-green-500' : 'bg-gray-400'
										}`}
									/>

									<Text
										className={`font-inter font-medium text-[11px] ${
											company.is_active ? 'text-gray-700' : 'text-gray-400'
										}`}
									>
										{company.is_active ? 'Ativo' : 'Inativo'}
									</Text>
								</View>
							</View>

							<View className="w-8 items-end justify-center">
								<ChevronRight size={17} color="#9CA3AF" />
							</View>
						</TouchableOpacity>
					</View>
				)}
				ListEmptyComponent={
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<Building2 size={18} color="#9CA3AF" />
						</View>

						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhum cliente encontrado
						</Text>

						<Text className="mt-1 font-inter text-gray-400 text-xs">
							Os clientes cadastrados aparecerão aqui.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
