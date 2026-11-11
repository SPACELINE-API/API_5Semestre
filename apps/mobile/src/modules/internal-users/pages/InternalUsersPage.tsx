import { useMemo, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { CircleAlert, Plus, Search, UserPlus } from 'lucide-react-native';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { getAuthorizationContext } from '../../auth/services/auth';
import { SettingsHeader } from '../../auth/components/SettingsHeader';
import { DepartmentSection } from '../components/DepartmentSection';
import { PendingInvitesCard } from '../components/PendingInvitesCard';
import {
	PersonFormModal,
	type PersonFormValues,
} from '../components/PersonFormModal';
import { useInternalUsers } from '../hooks/useInternalUsers';
import {
	addInternalUserRole,
	createInternalUser,
	deactivateInternalUser,
	removeInternalUserRole,
	resendPasswordSetupLink,
	sendPasswordSetupLink,
	updateInternalUser,
} from '../services/internalUsersService';
import type { InternalUser, StatusFilter } from '../types/internalUser';
import {
	canSendInitialLink,
	displayName,
	filterPeople,
	groupByDepartment,
	syncRoles,
} from '../utils/departments';

const FILTERS: { key: StatusFilter; label: string }[] = [
	{ key: 'all', label: 'Todas' },
	{ key: 'ativa', label: 'Ativas' },
	{ key: 'inativa', label: 'Inativas' },
];

function errorText(cause: unknown, fallback: string) {
	return cause instanceof Error && cause.message ? cause.message : fallback;
}

export function InternalUsersPage() {
	const { people, roles, isLoading, error, reload } = useInternalUsers();
	const { toast, showToast } = useToast();
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [formOpen, setFormOpen] = useState(false);
	const [editing, setEditing] = useState<InternalUser | null>(null);
	const [deactivating, setDeactivating] = useState<InternalUser | null>(null);
	const [isDeactivating, setIsDeactivating] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const currentUserEmail = getAuthorizationContext()?.user.email ?? null;

	const departments = useMemo(
		() => groupByDepartment(filterPeople(people, search, statusFilter)),
		[people, search, statusFilter],
	);
	const counts = useMemo(
		() => ({
			all: people.length,
			ativa: people.filter((person) => person.is_active).length,
			inativa: people.filter((person) => !person.is_active).length,
		}),
		[people],
	);

	function openCreate() {
		setEditing(null);
		setFormOpen(true);
	}

	function openEdit(person: InternalUser) {
		setEditing(person);
		setFormOpen(true);
	}

	async function handleSubmit(values: PersonFormValues) {
		if (!editing) {
			const created = await createInternalUser({
				name: values.name,
				email: values.email,
				phone: values.phone,
				role_ids: values.roleIds,
			});
			try {
				await sendPasswordSetupLink(created.id);
				showToast(`Convite enviado para ${values.email}.`);
			} catch (cause) {
				showToast(
					`Pessoa cadastrada, mas o e-mail não foi enviado: ${errorText(cause, 'tente reenviar o link.')}`,
					'error',
				);
			}
			await reload();
			return;
		}

		const currentRoleIds = editing.roles.map((role) => role.id);
		const { toAdd, toRemove } = syncRoles(currentRoleIds, values.roleIds);
		const changedData =
			values.name !== (editing.name ?? '') ||
			values.phone !== (editing.phone ?? '') ||
			(!editing.password_defined && values.email !== editing.email);

		if (changedData) {
			await updateInternalUser(editing.id, {
				name: values.name,
				phone: values.phone,
				...(editing.password_defined ? {} : { email: values.email }),
			});
		}
		for (const roleId of toAdd) await addInternalUserRole(editing.id, roleId);
		for (const roleId of toRemove)
			await removeInternalUserRole(editing.id, roleId);
		showToast('Alterações salvas.');
		await reload();
	}

	async function handleSendLink(person: InternalUser) {
		setBusyId(person.id);
		try {
			const isInitial = canSendInitialLink(person);
			if (isInitial) await sendPasswordSetupLink(person.id);
			else await resendPasswordSetupLink(person.id);
			showToast(
				`${isInitial ? 'Link enviado' : 'Link reenviado'} para ${person.email}.`,
			);
			await reload();
		} catch (cause) {
			showToast(
				errorText(cause, 'Não foi possível enviar o e-mail. Tente novamente.'),
				'error',
			);
		} finally {
			setBusyId(null);
		}
	}

	async function confirmDeactivate() {
		if (!deactivating) return;
		setIsDeactivating(true);
		try {
			await deactivateInternalUser(deactivating.id);
			showToast(`${displayName(deactivating)} foi desativada.`);
			setDeactivating(null);
			await reload();
		} catch (cause) {
			showToast(
				errorText(cause, 'Não foi possível desativar a conta.'),
				'error',
			);
			setDeactivating(null);
		} finally {
			setIsDeactivating(false);
		}
	}

	return (
		<View className="flex-1 bg-white">
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
				keyboardShouldPersistTaps="handled"
			>
				<SettingsHeader active="pessoas" />

				<View className="mb-5 flex-row flex-wrap items-start justify-between gap-4">
					<View className="min-w-[220px] flex-1">
						<Text className="font-inter font-semibold text-gray-900 text-base">
							Pessoas internas
						</Text>
						<Text className="mt-1 font-inter text-gray-500 text-sm">
							Convide e gerencie quem trabalha na plataforma, separado por
							departamento. As permissões de cada perfil ficam na aba
							Permissões.
						</Text>
					</View>
					<TouchableOpacity
						onPress={openCreate}
						accessibilityRole="button"
						accessibilityLabel="Convidar pessoa"
						className="shrink-0 flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-3"
					>
						<Plus size={16} color="#FFFFFF" />
						<Text className="font-inter font-semibold text-sm text-white">
							Convidar pessoa
						</Text>
					</TouchableOpacity>
				</View>

				<PendingInvitesCard
					people={people}
					busyId={busyId}
					onResend={(person) => void handleSendLink(person)}
				/>

				<View className="mb-5 flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<View className="h-11 flex-1 flex-row items-center gap-2 rounded-lg border border-gray-300 px-3 md:max-w-[420px]">
						<Search size={16} color="#9CA3AF" />
						<TextInput
							value={search}
							onChangeText={setSearch}
							placeholder="Buscar por nome ou e-mail"
							placeholderTextColor="#9CA3AF"
							accessibilityLabel="Buscar pessoa"
							className="h-full flex-1 font-inter text-gray-900 text-sm outline-none"
						/>
					</View>
					<View className="flex-row flex-wrap gap-2">
						{FILTERS.map((item) => {
							const active = item.key === statusFilter;
							return (
								<TouchableOpacity
									key={item.key}
									onPress={() => setStatusFilter(item.key)}
									accessibilityRole="button"
									accessibilityState={{ selected: active }}
									className={`flex-row items-center gap-2 rounded-full border px-3.5 py-1.5 ${
										active
											? 'border-blue-600 bg-blue-600'
											: 'border-gray-200 bg-white'
									}`}
								>
									<Text
										className={`font-inter font-medium text-xs ${
											active ? 'text-white' : 'text-gray-700'
										}`}
									>
										{item.label}
									</Text>
									<View
										className={`min-w-[20px] items-center rounded-full px-1.5 py-0.5 ${
											active ? 'bg-white/20' : 'bg-gray-100'
										}`}
									>
										<Text
											className={`font-inter font-semibold text-[11px] ${
												active ? 'text-white' : 'text-gray-600'
											}`}
										>
											{counts[item.key]}
										</Text>
									</View>
								</TouchableOpacity>
							);
						})}
					</View>
				</View>

				{isLoading && people.length === 0 ? (
					<View className="items-center py-16">
						<ActivityIndicator color="#6B7280" />
						<Text className="mt-2 font-inter text-gray-400 text-sm">
							Carregando pessoas...
						</Text>
					</View>
				) : error ? (
					<View className="flex-row items-center justify-between gap-3 rounded-lg bg-red-50 px-4 py-3">
						<View className="flex-1 flex-row items-center gap-2">
							<CircleAlert size={16} color="#B91C1C" />
							<Text className="flex-1 font-inter text-red-900 text-sm">
								{error}
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => void reload()}
							accessibilityRole="button"
						>
							<Text className="font-inter font-semibold text-red-900 text-sm">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : people.length === 0 ? (
					<View className="items-center gap-3 rounded-xl border border-dashed border-gray-300 px-6 py-14">
						<View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
							<UserPlus size={22} color="#2563EB" />
						</View>
						<Text className="text-center font-inter font-semibold text-gray-800 text-base">
							Convide a primeira pessoa
						</Text>
						<Text className="max-w-[360px] text-center font-inter text-gray-500 text-sm">
							Cadastre quem vai trabalhar na plataforma. A pessoa recebe um
							e-mail para criar a própria senha.
						</Text>
						<TouchableOpacity
							onPress={openCreate}
							accessibilityRole="button"
							className="mt-1 rounded-lg bg-blue-600 px-4 py-2.5"
						>
							<Text className="font-inter font-semibold text-sm text-white">
								Convidar pessoa
							</Text>
						</TouchableOpacity>
					</View>
				) : departments.length === 0 ? (
					<View className="items-center gap-2 rounded-xl border border-dashed border-gray-300 px-6 py-12">
						<Search size={24} color="#9CA3AF" />
						<Text className="text-center font-inter text-gray-500 text-sm">
							Nenhuma pessoa encontrada para esse filtro.
						</Text>
					</View>
				) : (
					<View className="gap-2">
						{departments.map((department) => (
							<DepartmentSection
								key={department.key}
								department={department}
								currentUserEmail={currentUserEmail}
								busyId={busyId}
								onEdit={openEdit}
								onSendLink={(person) => void handleSendLink(person)}
								onDeactivate={setDeactivating}
							/>
						))}
					</View>
				)}
			</ScrollView>

			<PersonFormModal
				visible={formOpen}
				person={editing}
				roles={roles}
				onClose={() => setFormOpen(false)}
				onSubmit={handleSubmit}
			/>
			<ConfirmDialog
				visible={deactivating !== null}
				title="Desativar conta?"
				message={`${deactivating ? displayName(deactivating) : ''} perde o acesso à plataforma. Os dados e o histórico são mantidos.`}
				confirmLabel="Desativar"
				destructive
				isLoading={isDeactivating}
				onConfirm={() => void confirmDeactivate()}
				onCancel={() => setDeactivating(null)}
			/>
			<Toast toast={toast} />
		</View>
	);
}
