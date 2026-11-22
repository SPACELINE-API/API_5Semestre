import { useRef, useState } from 'react';
import { SearchTextInput } from '../../../shared/components/SearchTextInput';
import {
	Modal,
	Pressable,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { Building2, Plus, Search, X } from 'lucide-react-native';
import type { Company } from '../../clients/types/company';
import { usePermission } from '../../auth/hooks/usePermission';
import { useThemeColors } from '../../../shared/theme/ThemeProvider';

export function CompanyLinkField({
	companies,
	companyId,
	label = 'Empresa vinculada',
	onSelectCompany,
	onRequestCreate,
}: {
	companies: Company[];
	companyId: string | null;
	label?: string;
	onSelectCompany: (id: string) => void;
	onRequestCreate: (searchText: string) => void;
}) {
	const themeColors = useThemeColors();
	const canWriteClients = usePermission('clients.write');
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState('');
	const triggerRef = useRef<View>(null);
	const [anchor, setAnchor] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);
	const selected = companies.find((company) => company.id === companyId);

	const filtered = companies.filter((company) => {
		const query = search.trim().toLowerCase();
		if (!query) return true;
		return (
			company.trade_name.toLowerCase().includes(query) ||
			company.legal_name.toLowerCase().includes(query)
		);
	});

	function openPicker() {
		triggerRef.current?.measureInWindow((x, y, width, height) => {
			setAnchor({ x, y, width, height });
			setIsOpen(true);
		});
	}

	function closePicker() {
		setIsOpen(false);
		setSearch('');
	}

	return (
		<View className="w-full gap-1">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				{label}
			</Text>
			<View ref={triggerRef} collapsable={false}>
				{selected ? (
					<View className="flex-row items-center justify-between rounded-lg border border-border-strong bg-surface px-3 py-2">
						<Text className="font-inter text-sm text-foreground">
							{selected.trade_name}
						</Text>
						<TouchableOpacity accessibilityRole="button" onPress={openPicker}>
							<Text className="font-inter-medium text-xs text-primary-text">
								Trocar
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity
						accessibilityRole="button"
						onPress={openPicker}
						className="flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-3 py-2.5"
					>
						<Building2 size={14} color={themeColors.foregroundMuted} />
						<Text className="font-inter-medium text-sm text-foreground-secondary">
							Vincular empresa
						</Text>
					</TouchableOpacity>
				)}
			</View>

			<Modal
				visible={isOpen && !!anchor}
				transparent
				animationType="none"
				onRequestClose={closePicker}
			>
				<Pressable className="absolute inset-0" onPress={closePicker} />

				{anchor && (
					<View
						className="absolute rounded-lg border border-border bg-surface shadow-sm"
						style={{
							top: anchor.y + anchor.height + 4,
							left: anchor.x,
							width: anchor.width,
							maxHeight: 280,
							backgroundColor: themeColors.surface,
						}}
					>
						<View className="flex-row items-center gap-2 border-b border-border-subtle px-3 py-2">
							<Search size={14} color={themeColors.foregroundSubtle} />
							<SearchTextInput
								autoFocus
								value={search}
								onChangeText={setSearch}
								placeholder="Buscar empresa"
								numberOfLines={1}
								placeholderTextColor={themeColors.foregroundSubtle}
								className="flex-1 font-inter text-ellipsis text-sm text-foreground max-md:min-w-0 max-md:shrink max-md:leading-5"
							/>
							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Fechar busca de empresa"
								onPress={closePicker}
							>
								<X size={14} color={themeColors.foregroundMuted} />
							</TouchableOpacity>
						</View>
						<ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
							{filtered.map((company) => (
								<TouchableOpacity
									key={company.id}
									onPress={() => {
										onSelectCompany(company.id);
										closePicker();
									}}
									className="border-b border-border-subtle px-3 py-2"
								>
									<Text className="font-inter text-sm text-foreground">
										{company.trade_name}
									</Text>
									<Text className="font-inter text-xs text-foreground-subtle">
										{company.legal_name}
									</Text>
								</TouchableOpacity>
							))}
							{filtered.length === 0 && (
								<Text className="px-3 py-3 font-inter text-sm text-foreground-subtle">
									Nenhuma empresa encontrada.
								</Text>
							)}
						</ScrollView>
						<TouchableOpacity
							accessibilityRole="button"
							onPress={() => {
								onRequestCreate(search.trim());
								closePicker();
							}}
							disabled={!canWriteClients}
							className={`flex-row items-center gap-2 border-t border-border-subtle bg-surface-subtle px-3 py-2.5 ${!canWriteClients ? 'opacity-40' : ''}`}
						>
							<Plus size={14} color={themeColors.primaryText} />
							<Text className="font-inter-medium text-xs text-primary-text">
								Criar nova empresa
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</Modal>
		</View>
	);
}
