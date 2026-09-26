import { useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useServiceOrder } from '../hooks/useServiceOrder';
import { useCompanies } from '../../clients/hooks/useCompanies';
import { useTranslators } from '../hooks/useTranslators';
import { useContacts } from '../hooks/useContacts';
import { useItemInvites } from '../hooks/useItemInvites';
import {
	ServiceOrderDetailsHeader,
	ServiceOrderDetailTabs,
	type ServiceOrderDetailTab,
	type ServiceOrderView,
} from '../components/ServiceOrderDetailsHeader';
import { ServiceOrderItemRow } from '../components/ServiceOrderItemRow';
import { WorkflowItemCard } from '../components/WorkflowItemCard';
import { GeneralInfoTab } from '../components/GeneralInfoTab';
import { ClientInfoTab } from '../components/ClientInfoTab';
import { ItemsTable } from '../components/ItemsTable';
import { ServiceOrderFilesTab } from '../components/ServiceOrderFilesTab';
import { TranslatorsInviteTab } from '../components/TranslatorsInviteTab';
import { InviteTranslatorsModal } from '../components/InviteTranslatorsModal';
import { AddItemModal } from '../components/AddItemModal';
import { EditItemModal } from '../components/EditItemModal';
import {
	createServiceOrderItem,
	deleteServiceOrder,
	sendItemInvites,
	updateServiceOrder,
	updateServiceOrderItem,
	uploadServiceOrderFile,
} from '../services/serviceOrderService';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import type { ServiceOrderItem } from '../types/serviceOrder';

type ServiceOrderDetailsPageProps = {
	id: string;
};

export function ServiceOrderDetailsPage({ id }: ServiceOrderDetailsPageProps) {
	const router = useRouter();

	const { serviceOrder, isLoading, error, refresh } = useServiceOrder(id);
	const { companies } = useCompanies();
	const { translators } = useTranslators();
	const { contacts } = useContacts();
	const { toast, showToast } = useToast();

	const [view, setView] = useState<ServiceOrderView>('detalhes');
	const [detailTab, setDetailTab] = useState<ServiceOrderDetailTab>('geral');
	const [inviteTargetItem, setInviteTargetItem] =
		useState<ServiceOrderItem | null>(null);
	const [refreshToken, setRefreshToken] = useState(0);
	const [isAddItemModalVisible, setIsAddItemModalVisible] = useState(false);
	const [editingItem, setEditingItem] = useState<ServiceOrderItem | null>(null);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const { invites: inviteTargetItemInvites } = useItemInvites(
		inviteTargetItem?.id ?? '',
		refreshToken,
	);

	const company = useMemo(
		() => companies.find((item) => item.id === serviceOrder?.company_id),
		[companies, serviceOrder],
	);

	const companyContacts = useMemo(
		() =>
			contacts.filter(
				(contact) => contact.company_id === serviceOrder?.company_id,
			),
		[contacts, serviceOrder],
	);

	const translatorsById = useMemo(
		() => new Map(translators.map((translator) => [translator.id, translator])),
		[translators],
	);

	async function handleDelete() {
		if (!serviceOrder) return;

		setIsDeleting(true);

		try {
			await deleteServiceOrder(serviceOrder.id);
			router.replace('/ordens-de-servico?deleted=1');
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir a ordem de serviço.',
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
					onPress={() => router.replace('/ordens-de-servico')}
					activeOpacity={0.7}
					className="mb-7 flex-row items-center gap-2"
				>
					<ArrowLeft size={16} color="#6B7280" />

					<Text className="font-inter text-gray-500 text-sm">
						Voltar para ordens de serviço
					</Text>
				</TouchableOpacity>

				{isLoading && (
					<View className="min-h-[500px] items-center justify-center">
						<ActivityIndicator size="large" color="#6B7280" />

						<Text className="mt-4 font-inter text-gray-400 text-sm">
							Carregando dados da ordem de serviço...
						</Text>
					</View>
				)}

				{!isLoading && error && (
					<View className="gap-1 border-t border-gray-200 py-8">
						<View className="flex-row items-center gap-2">
							<AlertCircle size={16} color="#DC2626" />

							<Text className="font-inter font-semibold text-red-600 text-sm">
								Não foi possível carregar a ordem de serviço
							</Text>
						</View>

						<Text className="font-inter text-gray-500 text-sm">{error}</Text>
					</View>
				)}

				{!isLoading && !error && serviceOrder && (
					<View>
						<ServiceOrderDetailsHeader
							serviceOrder={serviceOrder}
							companyName={company?.trade_name ?? 'Empresa não encontrada'}
							view={view}
							isLoading={isLoading}
							onRefresh={() => {
								refresh();
								setRefreshToken((current) => current + 1);
							}}
							onDelete={() => setIsDeleteConfirmVisible(true)}
							onViewChange={setView}
						/>

						{view === 'detalhes' && (
							<View>
								<ServiceOrderDetailTabs
									selected={detailTab}
									onSelect={setDetailTab}
								/>

								<View className="py-7">
									{detailTab === 'equipe' && (
										<View>
											{serviceOrder.items.map((item) => (
												<ServiceOrderItemRow
													key={item.id}
													item={item}
													translatorsById={translatorsById}
													onInviteTranslators={setInviteTargetItem}
													refreshToken={refreshToken}
												/>
											))}

											{serviceOrder.items.length === 0 && (
												<Text className="font-inter text-gray-400 text-sm">
													Esta ordem de serviço não possui itens.
												</Text>
											)}
										</View>
									)}

									{detailTab === 'tradutores' && (
										<TranslatorsInviteTab
											items={serviceOrder.items}
											translators={translators}
											translatorsById={translatorsById}
											refreshToken={refreshToken}
											onSendInvites={async (itemId, translatorIds) => {
												try {
													await sendItemInvites(itemId, translatorIds);
													setRefreshToken((current) => current + 1);
													showToast(
														'Convites enviados com sucesso!',
														'success',
													);
												} catch (submitError) {
													showToast(
														submitError instanceof Error
															? submitError.message
															: 'Não foi possível enviar os convites.',
														'error',
													);
												}
											}}
										/>
									)}

									{detailTab === 'cliente' && (
										<ClientInfoTab
											company={company ?? null}
											contacts={companyContacts}
										/>
									)}

									{detailTab === 'geral' && (
										<GeneralInfoTab
											serviceOrder={serviceOrder}
											onSave={async (data) => {
												try {
													await updateServiceOrder(serviceOrder.id, data);
													await refresh();
													showToast('Dados salvos com sucesso!', 'success');
												} catch (submitError) {
													showToast(
														submitError instanceof Error
															? submitError.message
															: 'Não foi possível salvar os dados.',
														'error',
													);
												}
											}}
										/>
									)}

									{detailTab === 'itens' && (
										<ItemsTable
											items={serviceOrder.items}
											translatorsById={translatorsById}
											onAddItem={() => setIsAddItemModalVisible(true)}
											onEditItem={setEditingItem}
										/>
									)}

									{detailTab === 'arquivos' && (
										<ServiceOrderFilesTab
											items={serviceOrder.items}
											files={serviceOrder.files}
											onUpload={async (file, direction) => {
												try {
													await uploadServiceOrderFile(
														serviceOrder.id,
														file,
														direction,
													);
													await refresh();
													showToast('Arquivo enviado com sucesso!', 'success');
												} catch (submitError) {
													showToast(
														submitError instanceof Error
															? submitError.message
															: 'Não foi possível enviar o arquivo.',
														'error',
													);
												}
											}}
										/>
									)}
								</View>
							</View>
						)}

						{view === 'workflow' && (
							<View className="gap-5 py-7">
								{serviceOrder.items.map((item) => (
									<WorkflowItemCard
										key={item.id}
										item={item}
										translatorsById={translatorsById}
										onInviteTranslators={setInviteTargetItem}
										refreshToken={refreshToken}
									/>
								))}

								{serviceOrder.items.length === 0 && (
									<Text className="font-inter text-gray-400 text-sm">
										Esta ordem de serviço não possui itens.
									</Text>
								)}
							</View>
						)}
					</View>
				)}
			</ScrollView>

			<InviteTranslatorsModal
				visible={inviteTargetItem !== null}
				translators={translators}
				pendingTranslatorIds={
					new Set(
						inviteTargetItemInvites
							.filter((invite) => invite.status === 'pendente')
							.map((invite) => invite.translator_id),
					)
				}
				onClose={() => setInviteTargetItem(null)}
				onSubmit={async (translatorIds) => {
					if (!inviteTargetItem) return;

					try {
						await sendItemInvites(inviteTargetItem.id, translatorIds);
						setRefreshToken((current) => current + 1);
						showToast('Convites enviados com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível enviar os convites.',
							'error',
						);
						throw submitError;
					}
				}}
				toast={toast}
			/>

			<AddItemModal
				visible={isAddItemModalVisible}
				onClose={() => setIsAddItemModalVisible(false)}
				onSubmit={async (data, file) => {
					if (!serviceOrder) return;

					try {
						await createServiceOrderItem(serviceOrder.id, data, file);
						await refresh();
						showToast('Item adicionado com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível adicionar o item.',
							'error',
						);
						throw submitError;
					}
				}}
			/>

			<EditItemModal
				item={editingItem}
				onClose={() => setEditingItem(null)}
				onSubmit={async (itemId, data, file) => {
					try {
						await updateServiceOrderItem(itemId, data, file);
						await refresh();
						showToast('Item atualizado com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível salvar o item.',
							'error',
						);
						throw submitError;
					}
				}}
			/>

			<ConfirmDialog
				visible={isDeleteConfirmVisible}
				title="Excluir ordem de serviço"
				message={`Tem certeza que deseja excluir "${serviceOrder?.project_name}"? Essa ação não pode ser desfeita.`}
				confirmLabel="Excluir"
				destructive
				isLoading={isDeleting}
				onConfirm={handleDelete}
				onCancel={() => setIsDeleteConfirmVisible(false)}
			/>

			<Toast
				toast={
					inviteTargetItem ||
					isAddItemModalVisible ||
					editingItem ||
					isDeleteConfirmVisible
						? null
						: toast
				}
			/>
		</View>
	);
}
