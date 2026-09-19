import { useState } from 'react';

import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';

import { ArrowLeft, AlertCircle, Pencil, Trash2 } from 'lucide-react-native';

import { useRouter } from 'expo-router';
import { useCompany } from '../hooks/useCompany';
import { StatusBadge } from '../components/StatusBadge';
import { CompanyEditModal } from '../components/CompanyEditModal';
import { deleteCompany, updateCompany } from '../services/companyService';
import { companyInitials, formatCnpj, formatDate } from '../utils/format';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';

type CompanyDetailsPageProps = {
	id: string;
};

type TabKey = 'info' | 'clients' | 'projects';

type Client = {
	id: string;
	name: string;
	role: string;
};

type Project = {
	id: string;
	name: string;
	status: 'Em andamento' | 'Concluído';
	updatedAt: string;
};

const mockClients: Client[] = [
	{
		id: '1',
		name: 'Ana Carolina Silva',
		role: 'Responsável comercial',
	},
	{
		id: '2',
		name: 'Lucas Martins',
		role: 'Gerente de projetos',
	},
	{
		id: '3',
		name: 'Mariana Oliveira',
		role: 'Coordenadora',
	},
];

const mockProjects: Project[] = [
	{
		id: '1',
		name: 'Projeto de Tradução Institucional',
		status: 'Em andamento',
		updatedAt: '12/09/2026',
	},
	{
		id: '2',
		name: 'Localização de Website',
		status: 'Em andamento',
		updatedAt: '08/09/2026',
	},
	{
		id: '3',
		name: 'Tradução de Documentos',
		status: 'Concluído',
		updatedAt: '01/09/2026',
	},
];

const PROJECT_STATUS_STYLE: Record<
	Project['status'],
	{ bg: string; text: string }
> = {
	'Em andamento': {
		bg: 'bg-blue-50',
		text: 'text-blue-900',
	},
	Concluído: {
		bg: 'bg-green-50',
		text: 'text-green-900',
	},
};

const TABS: { key: TabKey; label: string }[] = [
	{
		key: 'info',
		label: 'Informações',
	},
	{
		key: 'clients',
		label: 'Clientes',
	},
	{
		key: 'projects',
		label: 'Projetos',
	},
];

type InfoFieldProps = {
	label: string;
	value?: string;
};

function InfoField({ label, value }: InfoFieldProps) {
	return (
		<View className="min-w-[180px] flex-1 gap-1">
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>

			<Text
				className="font-inter font-medium text-gray-800 text-sm"
				numberOfLines={2}
			>
				{value || 'Não informado'}
			</Text>
		</View>
	);
}

function TableHeaderCell({
	label,
	flex = 1,
}: {
	label: string;
	flex?: number;
}) {
	return (
		<View style={{ flex }}>
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
		</View>
	);
}

function ClientRow({ client, isFirst }: { client: Client; isFirst: boolean }) {
	return (
		<View
			className={`flex-row items-center py-3.5 ${
				isFirst ? '' : 'border-t border-gray-100'
			}`}
		>
			<View style={{ flex: 2 }} className="flex-row items-center gap-2.5">
				<View className="h-8 w-8 items-center justify-center rounded-full bg-gray-100">
					<Text className="font-inter font-semibold text-gray-500 text-[11px]">
						{client.name[0]?.toUpperCase() ?? '?'}
					</Text>
				</View>

				<Text className="font-inter font-medium text-gray-800 text-sm">
					{client.name}
				</Text>
			</View>

			<Text style={{ flex: 2 }} className="font-inter text-gray-500 text-sm">
				{client.role}
			</Text>
		</View>
	);
}

function ProjectRow({
	project,
	isFirst,
}: {
	project: Project;
	isFirst: boolean;
}) {
	const statusStyle = PROJECT_STATUS_STYLE[project.status];

	return (
		<View
			className={`flex-row items-center py-3.5 ${
				isFirst ? '' : 'border-t border-gray-100'
			}`}
		>
			<Text
				style={{ flex: 3 }}
				className="font-inter font-medium text-gray-800 text-sm"
				numberOfLines={1}
			>
				{project.name}
			</Text>

			<View style={{ flex: 2 }}>
				<View className={`self-start rounded-md px-2 py-1 ${statusStyle.bg}`}>
					<Text
						className={`font-inter font-medium text-xs ${statusStyle.text}`}
					>
						{project.status}
					</Text>
				</View>
			</View>

			<Text style={{ flex: 2 }} className="font-inter text-gray-500 text-sm">
				{project.updatedAt}
			</Text>
		</View>
	);
}

export function CompanyDetailsPage({ id }: CompanyDetailsPageProps) {
	const router = useRouter();

	const [activeTab, setActiveTab] = useState<TabKey>('info');
	const [isEditVisible, setIsEditVisible] = useState(false);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const { company, isLoading, error, setCompany } = useCompany(id);
	const { toast, showToast } = useToast();

	async function handleDelete() {
		if (!company) return;

		setIsDeleting(true);

		try {
			await deleteCompany(company.id);
			router.replace('/clientes');
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir a empresa.',
				'error',
			);
			setIsDeleting(false);
			setIsDeleteConfirmVisible(false);
		}
	}

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="
					px-6
					py-6
					md:px-10
					md:py-8
					md:max-w-[1200px]
					md:w-full
					md:self-center
				"
			>
				<TouchableOpacity
					onPress={() => router.back()}
					activeOpacity={0.7}
					className="mb-7 flex-row items-center gap-2"
				>
					<ArrowLeft size={16} color="#6B7280" />

					<Text className="font-inter text-gray-500 text-sm">
						Voltar para clientes
					</Text>
				</TouchableOpacity>

				{isLoading && (
					<View className="min-h-[500px] items-center justify-center">
						<ActivityIndicator size="large" color="#6B7280" />

						<Text className="mt-4 font-inter text-gray-400 text-sm">
							Carregando dados da empresa...
						</Text>
					</View>
				)}

				{!isLoading && error && (
					<View className="gap-1 border-t border-gray-200 py-8">
						<View className="flex-row items-center gap-2">
							<AlertCircle size={16} color="#DC2626" />

							<Text className="font-inter font-semibold text-red-600 text-sm">
								Não foi possível carregar a empresa
							</Text>
						</View>

						<Text className="font-inter text-gray-500 text-sm">{error}</Text>
					</View>
				)}

				{!isLoading && !error && company && (
					<View>
						<View className="border-b border-gray-200 pb-7">
							<View className="flex-col gap-6 md:flex-row md:items-center md:justify-between">
								<View className="flex-row items-center gap-4">
									<View className="h-14 w-14 items-center justify-center rounded-full bg-gray-100">
										<Text className="font-inter font-bold text-gray-600 text-base">
											{companyInitials(company.trade_name)}
										</Text>
									</View>

									<View className="flex-1">
										<View className="flex-row flex-wrap items-center gap-2">
											<Text className="font-inter font-bold text-gray-950 text-xl">
												{company.trade_name}
											</Text>

											<StatusBadge isActive={company.is_active} />
										</View>

										<Text className="font-inter text-gray-400 text-sm mt-1">
											{company.legal_name}
										</Text>
									</View>
								</View>

								<View className="flex-row items-center gap-5 self-start md:self-auto">
									<View className="flex-row items-center">
										<View className="px-5">
											<Text className="font-inter font-bold text-gray-900 text-lg">
												{mockClients.length}
											</Text>

											<Text className="font-inter text-gray-400 text-xs">
												Clientes
											</Text>
										</View>

										<View className="h-10 w-px bg-gray-200" />

										<View className="px-5">
											<Text className="font-inter font-bold text-gray-900 text-lg">
												{mockProjects.length}
											</Text>

											<Text className="font-inter text-gray-400 text-xs">
												Projetos
											</Text>
										</View>
									</View>

									<View className="flex-row items-center gap-2">
										<TouchableOpacity
											onPress={() => setIsEditVisible(true)}
											activeOpacity={0.7}
											className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
										>
											<Pencil size={14} color="#353535" />
											<Text className="font-inter font-semibold text-gray-800 text-xs">
												Editar
											</Text>
										</TouchableOpacity>

										<TouchableOpacity
											onPress={() => setIsDeleteConfirmVisible(true)}
											activeOpacity={0.7}
											className="flex-row items-center gap-1.5 rounded-lg border border-red-50 bg-red-50 px-3 py-2"
										>
											<Trash2 size={14} color="#791F1F" />
											<Text className="font-inter font-semibold text-red-900 text-xs">
												Excluir
											</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						</View>

						<View className="flex-row gap-7 border-b border-gray-200">
							{TABS.map((tab) => {
								const isActive = tab.key === activeTab;

								return (
									<TouchableOpacity
										key={tab.key}
										onPress={() => setActiveTab(tab.key)}
										activeOpacity={0.7}
										className={`border-b-2 py-3 ${
											isActive ? 'border-blue-600' : 'border-transparent'
										}`}
									>
										<Text
											className={`font-inter text-sm ${
												isActive
													? 'font-semibold text-blue-600'
													: 'font-medium text-gray-400'
											}`}
										>
											{tab.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>

						<View className="py-7">
							{activeTab === 'info' && (
								<View className="gap-8">
									<View className="gap-4">
										<Text className="font-inter font-semibold text-gray-900 text-sm">
											Dados gerais
										</Text>

										<View className="flex-row flex-wrap gap-x-10 gap-y-6">
											<InfoField
												label="CNPJ"
												value={formatCnpj(company.cnpj)}
											/>

											<InfoField label="Segmento" value={company.industry} />

											<InfoField label="Telefone" value={company.phone} />

											<InfoField label="E-mail" value={company.email} />
										</View>
									</View>

									<View className="border-t border-gray-100 pt-7">
										<View className="gap-4">
											<Text className="font-inter font-semibold text-gray-900 text-sm">
												Endereço
											</Text>

											<View className="flex-row flex-wrap gap-x-10 gap-y-6">
												<InfoField
													label="Logradouro"
													value={`${company.street}${
														company.number ? `, ${company.number}` : ''
													}${
														company.complement ? ` - ${company.complement}` : ''
													}`}
												/>

												<InfoField
													label="Bairro"
													value={company.neighborhood}
												/>

												<InfoField
													label="Cidade"
													value={
														company.city && company.state
															? `${company.city} - ${company.state}`
															: company.city
													}
												/>

												<InfoField label="CEP" value={company.zip_code} />
											</View>
										</View>
									</View>

									<View className="border-t border-gray-100 pt-7">
										<View className="gap-4">
											<Text className="font-inter font-semibold text-gray-900 text-sm">
												Registro
											</Text>

											<View className="flex-row flex-wrap gap-x-10 gap-y-6">
												<InfoField
													label="Cadastrado em"
													value={formatDate(company.created_at)}
												/>

												<InfoField
													label="Última atualização"
													value={formatDate(company.updated_at)}
												/>
											</View>
										</View>
									</View>
								</View>
							)}

							{activeTab === 'clients' && (
								<View>
									<View className="flex-row items-center border-b border-gray-100 pb-3">
										<TableHeaderCell label="Nome" flex={2} />

										<TableHeaderCell label="Cargo" flex={2} />
									</View>

									{mockClients.map((client, index) => (
										<ClientRow
											key={client.id}
											client={client}
											isFirst={index === 0}
										/>
									))}
								</View>
							)}

							{activeTab === 'projects' && (
								<View>
									<View className="flex-row items-center border-b border-gray-100 pb-3">
										<TableHeaderCell label="Projeto" flex={3} />

										<TableHeaderCell label="Status" flex={2} />

										<TableHeaderCell label="Atualizado em" flex={2} />
									</View>

									{mockProjects.map((project, index) => (
										<ProjectRow
											key={project.id}
											project={project}
											isFirst={index === 0}
										/>
									))}
								</View>
							)}
						</View>
					</View>
				)}
			</ScrollView>

			{company && (
				<CompanyEditModal
					visible={isEditVisible}
					company={company}
					onClose={() => setIsEditVisible(false)}
					onSubmit={async (data) => {
						try {
							const updated = await updateCompany(company.id, data);
							setCompany(updated);
							setIsEditVisible(false);
							showToast('Empresa atualizada com sucesso!', 'success');
						} catch (submitError) {
							showToast(
								submitError instanceof Error
									? submitError.message
									: 'Não foi possível salvar as alterações.',
								'error',
							);
							throw submitError;
						}
					}}
					toast={toast}
				/>
			)}

			<ConfirmDialog
				visible={isDeleteConfirmVisible}
				title="Excluir empresa"
				message={`Tem certeza que deseja excluir "${company?.trade_name}"? Essa ação não pode ser desfeita.`}
				confirmLabel="Excluir"
				destructive
				isLoading={isDeleting}
				onConfirm={handleDelete}
				onCancel={() => setIsDeleteConfirmVisible(false)}
			/>

			<Toast toast={isEditVisible || isDeleteConfirmVisible ? null : toast} />
		</View>
	);
}
