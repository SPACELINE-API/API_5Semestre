import { View, Text, Switch } from 'react-native';
import type { PermissionModule, Role } from '../../types/roles';

const TOGGLE_COLORS = {
	trackOff: '#e5e7eb',
	trackOn: '#93c5fd',
	thumbOff: '#f9fafb',
	thumbOn: '#2563eb',
};

export interface ConfigPermissionsProps {
	module: PermissionModule;
	profile: Role;
	disabled?: boolean;
	onChange: (permissionIds: string[]) => void;
}

type PermissionKind = 'read' | 'write';

export default function ConfigPermissions({
	module,
	profile,
	disabled = false,
	onChange,
}: ConfigPermissionsProps) {
	const permissionIds = new Set(profile.permissions.map(({ id }) => id));
	const canView = Boolean(module.read && permissionIds.has(module.read.id));
	const canEdit = Boolean(module.write && permissionIds.has(module.write.id));

	function handleToggle(kind: PermissionKind, enabled: boolean) {
		const nextIds = new Set(permissionIds);

		if (kind === 'read' && module.read) {
			if (enabled) {
				nextIds.add(module.read.id);
			} else {
				nextIds.delete(module.read.id);
				if (module.write) nextIds.delete(module.write.id);
			}
		}

		if (kind === 'write' && module.write) {
			if (enabled) {
				nextIds.add(module.write.id);
				if (module.read) nextIds.add(module.read.id);
			} else {
				nextIds.delete(module.write.id);
			}
		}

		onChange([...nextIds]);
	}

	return (
		<View className="w-full sm:w-[170px] rounded-xl border border-gray-200 bg-white p-4 gap-4">
			<Text className="font-inter font-medium text-gray-900 text-sm">
				{module.label}
			</Text>

			<View className="gap-3">
				{module.read && (
					<PermissionToggle
						label="Visualização"
						value={canView}
						disabled={disabled}
						onChange={(enabled) => handleToggle('read', enabled)}
					/>
				)}
				{module.write && (
					<PermissionToggle
						label="Edição"
						value={canEdit}
						disabled={disabled}
						onChange={(enabled) => handleToggle('write', enabled)}
					/>
				)}
			</View>
		</View>
	);
}

type PermissionToggleProps = {
	label: string;
	value: boolean;
	disabled: boolean;
	onChange: (enabled: boolean) => void;
};

const webThumbProps = { activeThumbColor: TOGGLE_COLORS.thumbOn } as object;

function PermissionToggle({
	label,
	value,
	disabled,
	onChange,
}: PermissionToggleProps) {
	return (
		<View className="flex-row items-center gap-2">
			<Switch
				accessibilityLabel={label}
				value={value}
				disabled={disabled}
				onValueChange={onChange}
				trackColor={{
					false: TOGGLE_COLORS.trackOff,
					true: TOGGLE_COLORS.trackOn,
				}}
				thumbColor={value ? TOGGLE_COLORS.thumbOn : TOGGLE_COLORS.thumbOff}
				{...webThumbProps}
				style={{ transform: [{ scale: 0.7 }] }}
			/>
			<Text className="font-inter text-gray-700 text-xs">{label}</Text>
		</View>
	);
}
