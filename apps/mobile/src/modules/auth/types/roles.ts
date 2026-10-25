export type Permission = {
	id: string;
	code: string;
	description: string | null;
};

export type Role = {
	id: string;
	name: string;
	description: string | null;
	is_active: boolean;
	permissions: Permission[];
};

export type RoleFormData = {
	name: string;
	description: string | null;
};

export type ExtraPermission = {
	permission: Permission;
	label: string;
};

export type PermissionModule = {
	key: string;
	label: string;
	read?: Permission;
	write?: Permission;
	extras: ExtraPermission[];
};
