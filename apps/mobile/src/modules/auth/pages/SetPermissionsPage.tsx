import { useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import ConfigPermissions from '../components/permissions/ConfigPermissions';
import { RoleFormModal } from '../components/permissions/RoleFormModal';
import SelectRole from '../components/permissions/SelectRole';
import { usePermission } from '../hooks/usePermission';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { isAdministratorRole } from '../services/authorization';
import type {
	Permission,
	PermissionModule,
	RoleFormData,
} from '../types/roles';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';

const MODULE_LABELS: Record<string, string> = {
	dashboard: 'Dashboard',
	requests: 'Requisições',
	quotes: 'Orçamentos',
	service_orders: 'Ordens de serviço',
	assignments: 'Tarefas atribuídas',
	clients: 'Clientes',
	contacts: 'Contatos',
	translators: 'Tradutores',
	documents: 'Documentos',
	projects: 'Projetos',
	support: 'Suporte',
	roles: 'Perfis de acesso',
	settings: 'Configurações',
};

const VISIBLE_PERMISSIONS = new Set([
	'dashboard.read',
	'requests.read',
	'requests.write',
	'quotes.read',
	'quotes.write',
	'service_orders.read',
	'service_orders.write',
	'assignments.read',
	'assignments.write',
	'clients.read',
	'clients.write',
	'contacts.read',
	'contacts.write',
	'translators.read',
	'translators.write',
	'documents.write',
	'projects.read',
	'support.read',
	'support.write',
	'settings.write',
	'roles.read',
	'roles.write',
]);

const EXTRA_PERMISSION_LABELS: Record<string, string> = {
	'quotes.approve': 'Aprovação',
	'assignments.respond': 'Responder convites',
	'assignments.manage': 'Gerenciar convites',
};

function buildModules(permissions: Permission[]): PermissionModule[] {
	const modules = new Map<string, PermissionModule>();

	for (const permission of permissions) {
		const extraLabel = EXTRA_PERMISSION_LABELS[permission.code];
		if (!VISIBLE_PERMISSIONS.has(permission.code) && !extraLabel) continue;
		const separator = permission.code.lastIndexOf('.');
		const key = permission.code.slice(0, separator);
		const action = permission.code.slice(separator + 1);

		const module = modules.get(key) ?? {
			key,
			label: MODULE_LABELS[key] ?? key,
			extras: [],
		};
		if (extraLabel) {
			module.extras.push({ permission, label: extraLabel });
		} else if (action === 'read' || action === 'write') {
			module[action] = permission;
		}
		modules.set(key, module);
	}

	return [...modules.values()].sort((a, b) =>
		a.label.localeCompare(b.label, 'pt-BR'),
	);
}

export default function SetPermissionsPage() {
	const { toast, showToast } = useToast();
	const canEditRoles = usePermission('roles.write');
	const {
		roles,
		permissions,
		isLoading,
		error,
		setRolePermissionIds,
		addRole,
	} = useRolePermissions({
		onError: (message) => showToast(message, 'error'),
	});
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
	const [showRoleModal, setShowRoleModal] = useState(false);

	async function handleCreateRole(data: RoleFormData) {
		const created = await addRole(data);
		setSelectedRoleId(created.id);
		showToast('Perfil cadastrado com sucesso!', 'success');
	}

	const modules = useMemo(() => buildModules(permissions), [permissions]);
	const editableRoles = useMemo(
		() => roles.filter((role) => !isAdministratorRole(role.name)),
		[roles],
	);
	const selectedRole =
		editableRoles.find((role) => role.id === selectedRoleId) ??
		editableRoles[0] ??
		null;

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="gap-6">
					<View>
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Configurações
						</Text>
						<Text className="mt-2 font-inter text-gray-400 text-sm">
							Usuários → Permissões
						</Text>
					</View>

					{isLoading ? (
						<View className="py-20 items-center">
							<ActivityIndicator size="large" color="#2563eb" />
						</View>
					) : error ? (
						<View className="py-20 items-center">
							<Text className="font-inter text-red-600 text-sm text-center">
								{error}
							</Text>
						</View>
					) : (
						<View className="rounded-2xl border border-gray-200 bg-white p-6 gap-6">
							<View className="flex-row justify-between flex-wrap items-end gap-3">
								<SelectRole
									roles={editableRoles}
									selectedRoleId={selectedRole?.id ?? null}
									onSelect={setSelectedRoleId}
								/>
								<TouchableOpacity
									accessibilityRole="button"
									onPress={() => setShowRoleModal(true)}
									disabled={!canEditRoles}
									className={`flex-row items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 ${!canEditRoles ? 'opacity-40' : ''}`}
								>
									<Plus size={15} color="#fff" />
									<Text className="font-inter-medium text-sm text-white">
										Novo perfil
									</Text>
								</TouchableOpacity>
							</View>

							{selectedRole && (
								<View className="gap-4 mt-5">
									<Text className="font-inter font-semibold text-gray-900 text-sm">
										{selectedRole.name}
									</Text>
									<View className="flex-row justify-between flex-wrap gap-4">
										{modules.map((module) => (
											<ConfigPermissions
												key={module.key}
												module={module}
												profile={selectedRole}
												disabled={!canEditRoles}
												onChange={(permissionIds) =>
													setRolePermissionIds(selectedRole.id, permissionIds)
												}
											/>
										))}
									</View>
								</View>
							)}
						</View>
					)}
				</View>
			</ScrollView>

			<RoleFormModal
				visible={showRoleModal}
				onClose={() => setShowRoleModal(false)}
				onSubmit={handleCreateRole}
			/>

			<Toast toast={toast} />
		</View>
	);
}
