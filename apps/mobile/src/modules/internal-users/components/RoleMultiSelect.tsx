import { useMemo, useState } from 'react';
import {
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react-native';
import type { Role } from '../../auth/types/roles';
import { normalizeText } from '../utils/departments';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type RoleMultiSelectProps = {
	roles: Role[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
};

function Box({ checked }: { checked: boolean }) {
	const themeColors = useThemeColors();
	return (
		<View
			className={`h-5 w-5 items-center justify-center rounded border ${
				checked
					? 'border-primary bg-primary'
					: 'border-border-strong bg-surface'
			}`}
		>
			{checked && <Check size={14} color={themeColors.primaryForeground} />}
		</View>
	);
}

export function RoleMultiSelect({
	roles,
	selectedIds,
	onChange,
}: RoleMultiSelectProps) {
	const themeColors = useThemeColors();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');

	const visibleRoles = useMemo(() => {
		const term = normalizeText(query);
		if (!term) return roles;
		return roles.filter((role) => normalizeText(role.name).includes(term));
	}, [roles, query]);

	const selectedRoles = roles.filter((role) => selectedIds.includes(role.id));
	const allSelected = roles.length > 0 && selectedIds.length === roles.length;

	function toggle(roleId: string) {
		onChange(
			selectedIds.includes(roleId)
				? selectedIds.filter((id) => id !== roleId)
				: [...selectedIds, roleId],
		);
	}

	function toggleAll() {
		onChange(allSelected ? [] : roles.map((role) => role.id));
	}

	const Chevron = open ? ChevronUp : ChevronDown;
	const summary =
		selectedIds.length === 0
			? 'Selecione os perfis'
			: selectedIds.length === 1
				? '1 perfil selecionado'
				: `${selectedIds.length} perfis selecionados`;

	return (
		<View className="gap-2">
			<TouchableOpacity
				onPress={() => setOpen((current) => !current)}
				accessibilityRole="button"
				accessibilityLabel="Perfis"
				accessibilityState={{ expanded: open }}
				className={`h-11 flex-row items-center justify-between rounded-lg border px-3 ${
					open ? 'border-primary' : 'border-border-strong'
				}`}
			>
				<Text
					className={`font-inter text-sm ${
						selectedIds.length === 0
							? 'text-foreground-subtle'
							: 'text-foreground'
					}`}
				>
					{summary}
				</Text>
				<Chevron size={16} color={themeColors.foregroundMuted} />
			</TouchableOpacity>

			{open && (
				<View className="overflow-hidden rounded-lg border border-border bg-surface">
					<View className="flex-row items-center gap-2 border-b border-border px-3">
						<Search size={14} color={themeColors.foregroundSubtle} />
						<TextInput
							value={query}
							onChangeText={setQuery}
							placeholder="Pesquisar"
							placeholderTextColor={themeColors.foregroundSubtle}
							accessibilityLabel="Pesquisar perfil"
							className="h-10 flex-1 font-inter text-foreground text-sm outline-none"
						/>
					</View>
					<ScrollView
						style={{ maxHeight: 224 }}
						keyboardShouldPersistTaps="handled"
						nestedScrollEnabled
					>
						<View className="flex-row items-center justify-between border-b border-border bg-surface-subtle px-3 py-2.5">
							<TouchableOpacity
								onPress={toggleAll}
								accessibilityRole="checkbox"
								accessibilityLabel="Selecionar todos os perfis"
								accessibilityState={{ checked: allSelected }}
								className="flex-row items-center gap-3"
							>
								<Box checked={allSelected} />
								<Text className="font-inter font-semibold text-foreground text-sm">
									Selecionar todos ({roles.length})
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => onChange([])}
								accessibilityRole="button"
								accessibilityLabel="Limpar seleção de perfis"
							>
								<Text className="font-inter text-primary-text text-sm">
									Limpar
								</Text>
							</TouchableOpacity>
						</View>
						{visibleRoles.length === 0 ? (
							<Text className="p-3 font-inter text-foreground-muted text-sm">
								Nenhum perfil encontrado.
							</Text>
						) : (
							visibleRoles.map((role) => {
								const selected = selectedIds.includes(role.id);
								return (
									<TouchableOpacity
										key={role.id}
										onPress={() => toggle(role.id)}
										accessibilityRole="checkbox"
										accessibilityState={{ checked: selected }}
										accessibilityLabel={role.name}
										activeOpacity={0.7}
										className={`flex-row items-center gap-3 px-3 py-2.5 ${
											selected ? 'bg-primary-soft' : ''
										}`}
									>
										<Box checked={selected} />
										<Text className="flex-1 font-inter text-foreground text-sm">
											{role.name}
										</Text>
									</TouchableOpacity>
								);
							})
						)}
					</ScrollView>
					<View className="flex-row items-center justify-between border-t border-border bg-surface px-3 py-2.5">
						<Text className="font-inter text-foreground-muted text-xs">
							{selectedIds.length} de {roles.length} selecionados
						</Text>
						<TouchableOpacity
							onPress={() => setOpen(false)}
							accessibilityRole="button"
						>
							<Text className="font-inter font-semibold text-primary-text text-sm">
								Concluir
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}

			{selectedRoles.length > 0 && (
				<View className="flex-row flex-wrap gap-2">
					{selectedRoles.map((role) => (
						<View
							key={role.id}
							className="flex-row items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1.5"
						>
							<Text className="font-inter text-primary-strong text-xs">
								{role.name}
							</Text>
							<TouchableOpacity
								onPress={() => toggle(role.id)}
								accessibilityRole="button"
								accessibilityLabel={`Remover ${role.name}`}
							>
								<X size={13} color={themeColors.primaryStrong} />
							</TouchableOpacity>
						</View>
					))}
				</View>
			)}
		</View>
	);
}
