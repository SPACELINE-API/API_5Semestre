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
			<Text className="font-inter-medium text-xs text-gray-500">
				Perfil de acesso
			</Text>
			<TouchableOpacity
				ref={triggerRef}
				accessibilityRole="button"
				accessibilityLabel="Selecionar perfil de acesso"
				className="border border-gray-200 rounded-xl p-3 bg-white flex-row justify-between items-center mt-1"
				onPress={openDropdown}
			>
				<Text
					className={`text-sm font-inter ${selectedRole ? 'text-gray-900' : 'text-gray-400'}`}
				>
					{selectedRole?.name ?? 'Selecione um perfil'}
				</Text>
				<ChevronDown size={16} color="#9ca3af" />
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
						className="absolute bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
						style={{
							top: anchor.y + anchor.height + 4,
							left: anchor.x,
							width: anchor.width,
							maxHeight: 240,
							backgroundColor: 'white',
						}}
					>
						<ScrollView nestedScrollEnabled>
							{roles.map((role) => (
								<TouchableOpacity
									key={role.id}
									className={`py-2 px-3 border-b border-gray-50 ${role.id === selectedRoleId ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
									onPress={() => {
										onSelect(role.id);
										setIsOpen(false);
									}}
								>
									<Text
										className={`font-inter text-sm ${role.id === selectedRoleId ? 'text-blue-700 font-inter-medium' : 'text-gray-700'}`}
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
