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

export default function ConfigPermissions({
	module,
	profile,
	disabled = false,
	onChange,
}: ConfigPermissionsProps) {
	const permissionIds = new Set(profile.permissions.map(({ id }) => id));
	const canView = Boolean(module.read && permissionIds.has(module.read.id));
	const writePermission = module.write;
	const canEdit = Boolean(
		writePermission && permissionIds.has(writePermission.id),
	);

	function handleReadToggle(enabled: boolean) {
		if (!module.read) return;
		const nextIds = new Set(permissionIds);

		if (enabled) {
			nextIds.add(module.read.id);
		} else {
			nextIds.delete(module.read.id);
			if (module.write) nextIds.delete(module.write.id);
			module.extras.forEach(({ permission }) => nextIds.delete(permission.id));
		}

		onChange([...nextIds]);
	}

	function handleDependentToggle(permissionId: string, enabled: boolean) {
		const nextIds = new Set(permissionIds);

		if (enabled) {
			nextIds.add(permissionId);
			if (module.read) nextIds.add(module.read.id);
		} else {
			nextIds.delete(permissionId);
		}

		onChange([...nextIds]);
	}

	return (
		<View className="w-full sm:w-[200px] sm:h-[210px] rounded-xl border border-gray-200 bg-white p-4 gap-4">
			<Text className="font-inter font-medium text-gray-900 text-sm">
				{module.label}
			</Text>

			<View className="gap-3">
				{module.read && (
					<PermissionToggle
						label="Visualização"
						value={canView}
						disabled={disabled}
						onChange={handleReadToggle}
					/>
				)}
				{writePermission && (
					<PermissionToggle
						label="Edição"
						value={canEdit}
						disabled={disabled}
						onChange={(enabled) =>
							handleDependentToggle(writePermission.id, enabled)
						}
					/>
				)}
				{module.extras.map(({ permission, label }) => (
					<PermissionToggle
						key={permission.id}
						label={label}
						value={permissionIds.has(permission.id)}
						disabled={disabled}
						onChange={(enabled) =>
							handleDependentToggle(permission.id, enabled)
						}
					/>
				))}
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
