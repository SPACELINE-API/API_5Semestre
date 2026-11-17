import { View, Text, FlatList, TouchableOpacity } from 'react-native';

import { ChevronRight, Building2, Check } from 'lucide-react-native';

import type { Company } from '../types/company';

import { companyInitials, formatCnpj } from '../utils/format';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
	accessibilityLabel,
}: {
	checked: boolean;
	onPress: () => void;
	accessibilityLabel: string;
}) {
	const themeColors = useThemeColors();
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			accessibilityRole="checkbox"
			accessibilityState={{ checked }}
			accessibilityLabel={accessibilityLabel}
			className={`h-[18px] w-[18px] items-center justify-center rounded border ${
				checked
					? 'border-primary bg-primary'
					: 'border-border-strong bg-surface'
			}`}
		>
			{checked && <Check size={12} color={themeColors.primaryForeground} />}
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
	const themeColors = useThemeColors();
	const allSelected =
		companies.length > 0 &&
		companies.every((company) => selectedIds.has(company.id));

	return (
		<View className="bg-surface">
			<View className="hidden h-11 flex-row items-center border-b border-border px-5 md:flex">
				<View className="w-10">
					<Checkbox
						checked={allSelected}
						onPress={onToggleSelectAll}
						accessibilityLabel="Selecionar todos"
					/>
				</View>

				<Text className="w-[26%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Empresa
				</Text>

				<Text className="w-[16%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					CNPJ
				</Text>

				<Text className="w-[24%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Contato
				</Text>

				<Text className="w-[14%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Área
				</Text>

				<Text className="w-[10%] font-inter font-medium text-[11px] uppercase tracking-wide text-foreground-subtle">
					Status
				</Text>

				<View className="w-8" />
			</View>

			<FlatList
				data={companies}
				keyExtractor={(company) => company.id}
				scrollEnabled={false}
				renderItem={({ item: company }) => (
					<View className="min-h-[78px] flex-row items-center border-b border-border-subtle px-4 py-4 md:px-5">
						<View className="w-10 items-start justify-center">
							<Checkbox
								checked={selectedIds.has(company.id)}
								onPress={() => onToggleSelect(company.id)}
								accessibilityLabel={`Selecionar ${company.trade_name}`}
							/>
						</View>

						<TouchableOpacity
							onPress={() => onSelectCompany?.(company)}
							activeOpacity={0.7}
							className="flex-1 flex-row items-center"
						>
							<View className="flex-1 flex-row items-center gap-3 md:w-[26%] md:flex-none md:pr-4">
								<View className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted">
									{company.trade_name ? (
										<Text className="font-inter font-semibold text-foreground-secondary text-xs">
											{companyInitials(company.trade_name)}
										</Text>
									) : (
										<Building2 size={17} color={themeColors.foregroundSubtle} />
									)}
								</View>

								<View className="min-w-0 flex-1">
									<Text
										className="font-inter font-semibold text-foreground text-sm"
										numberOfLines={1}
									>
										{company.trade_name}
									</Text>

									<Text
										className="mt-0.5 font-inter text-foreground-subtle text-xs"
										numberOfLines={1}
									>
										{company.legal_name}
									</Text>
								</View>
							</View>

							<View className="hidden w-[16%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-foreground-secondary text-sm"
									numberOfLines={1}
								>
									{formatCnpj(company.cnpj)}
								</Text>
							</View>

							<View className="hidden w-[24%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-foreground-secondary text-sm"
									numberOfLines={1}
								>
									{company.email || 'Não informado'}
								</Text>

								{company.phone && (
									<Text
										className="mt-0.5 font-inter text-foreground-subtle text-xs"
										numberOfLines={1}
									>
										{company.phone}
									</Text>
								)}
							</View>

							<View className="hidden w-[14%] min-w-0 flex-none pr-3 md:flex">
								<Text
									className="font-inter text-foreground-secondary text-sm"
									numberOfLines={1}
								>
									{company.industry || 'Não informado'}
								</Text>
							</View>

							<View className="hidden w-[10%] min-w-0 flex-none md:flex">
								<View
									className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${
										company.is_active ? 'bg-surface-muted' : 'bg-surface-subtle'
									}`}
								>
									<View
										className={`h-1.5 w-1.5 rounded-full ${
											company.is_active ? 'bg-success' : 'bg-foreground-subtle'
										}`}
									/>

									<Text
										className={`font-inter font-medium text-[11px] ${
											company.is_active
												? 'text-foreground-secondary'
												: 'text-foreground-subtle'
										}`}
									>
										{company.is_active ? 'Ativo' : 'Inativo'}
									</Text>
								</View>
							</View>

							<View className="w-8 items-end justify-center">
								<ChevronRight size={17} color={themeColors.foregroundSubtle} />
							</View>
						</TouchableOpacity>
					</View>
				)}
				ListEmptyComponent={
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
							<Building2 size={18} color={themeColors.foregroundSubtle} />
						</View>

						<Text className="font-inter font-medium text-foreground text-sm">
							Nenhum cliente encontrado
						</Text>

						<Text className="mt-1 font-inter text-foreground-subtle text-xs">
							Os clientes cadastrados aparecerão aqui.
						</Text>
					</View>
				}
			/>
		</View>
	);
}
