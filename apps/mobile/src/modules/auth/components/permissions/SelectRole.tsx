import { useRef, useState } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	ScrollView,
	Pressable,
} from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import type { Role } from '../../types/roles';

import { useThemeColors } from '../../../../shared/theme/ThemeProvider';
interface SelectRoleProps {
	roles: Role[];
	selectedRoleId: string | null;
	onSelect: (roleId: string) => void;
}

export default function SelectRole({
	roles,
	selectedRoleId,
	onSelect,
}: SelectRoleProps) {
	const themeColors = useThemeColors();
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<View>(null);
	const [anchor, setAnchor] = useState<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>(null);

	const selectedRole = roles.find((role) => role.id === selectedRoleId);

	function openDropdown() {
		triggerRef.current?.measureInWindow((x, y, width, height) => {
			setAnchor({ x, y, width, height });
			setIsOpen(true);
		});
	}

	return (
		<View className="w-full sm:w-[280px] gap-1">
			<Text className="font-inter-medium text-xs text-foreground-muted">
				Perfil de acesso
			</Text>
			<TouchableOpacity
				ref={triggerRef}
				accessibilityRole="button"
				accessibilityLabel="Selecionar perfil de acesso"
				className="border border-border rounded-xl p-3 bg-surface flex-row justify-between items-center mt-1"
				onPress={openDropdown}
			>
				<Text
					className={`text-sm font-inter ${selectedRole ? 'text-foreground' : 'text-foreground-subtle'}`}
				>
					{selectedRole?.name ?? 'Selecione um perfil'}
				</Text>
				<ChevronDown size={16} color={themeColors.foregroundSubtle} />
			</TouchableOpacity>

			<Modal
				visible={isOpen && !!anchor}
				transparent
				animationType="none"
				onRequestClose={() => setIsOpen(false)}
			>
				<Pressable
					className="absolute inset-0"
					onPress={() => setIsOpen(false)}
				/>

				{anchor && (
					<View
						className="absolute bg-surface border border-border rounded-lg shadow-sm overflow-hidden"
						style={{
							top: anchor.y + anchor.height + 4,
							left: anchor.x,
							width: anchor.width,
							maxHeight: 240,
							backgroundColor: themeColors.surface,
						}}
					>
						<ScrollView nestedScrollEnabled>
							{roles.map((role) => (
								<TouchableOpacity
									key={role.id}
									className={`py-2 px-3 border-b border-border-subtle ${role.id === selectedRoleId ? 'bg-primary-soft' : 'bg-surface hover:bg-surface-subtle'}`}
									onPress={() => {
										onSelect(role.id);
										setIsOpen(false);
									}}
								>
									<Text
										className={`font-inter text-sm ${role.id === selectedRoleId ? 'text-primary-text font-inter-medium' : 'text-foreground-secondary'}`}
									>
										{role.name}
									</Text>
								</TouchableOpacity>
							))}
						</ScrollView>
					</View>
				)}
			</Modal>
		</View>
	);
}
