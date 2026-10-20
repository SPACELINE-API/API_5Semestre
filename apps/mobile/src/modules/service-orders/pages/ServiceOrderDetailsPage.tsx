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
import { useAdditionalServices } from '../hooks/useAdditionalServices';
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
import { ItemReviewTab } from '../components/ItemReviewTab';
import { canCompleteOrder, pendingReviewDeliveries } from '../utils/fileReview';
import { InviteTranslatorsModal } from '../components/InviteTranslatorsModal';
import { AddItemModal } from '../components/AddItemModal';
import { EditItemModal } from '../components/EditItemModal';
import {
	approveServiceOrderFile,
	createServiceOrderItem,
	deleteServiceOrder,
	deleteServiceOrderFile,
	deleteServiceOrderItem,
	deleteServiceOrderItemFile,
	requestServiceOrderFileChanges,
	sendItemInvites,
	updateServiceOrder,
	updateServiceOrderItem,
	uploadServiceOrderFile,
} from '../services/serviceOrderService';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import type { ServiceOrderItem } from '../types/serviceOrder';
import { CompleteServiceOrderModal } from '../components/CompleteServiceOrderModal';
import { AdditionalServicesTab } from '../components/AdditionalServicesTab';
import { AdditionalServiceFormModal } from '../../quotes/components/AdditionalServiceFormModal';
import {
	createAdditionalService,
	updateAdditionalService,
	updateAdditionalServiceStatus,
	type AdditionalService,
} from '../../quotes/services/additionalService';

type ServiceOrderDetailsPageProps = {
	id: string;
};

export function ServiceOrderDetailsPage({ id }: ServiceOrderDetailsPageProps) {
	const router = useRouter();

	const { serviceOrder, isLoading, error, refresh, setServiceOrder } =
		useServiceOrder(id);
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
	const [isAdditionalServiceModalVisible, setIsAdditionalServiceModalVisible] =
		useState(false);
	const [editingAdditionalService, setEditingAdditionalService] =
		useState<AdditionalService | null>(null);
	const [editingItem, setEditingItem] = useState<ServiceOrderItem | null>(null);
	const [deletingItem, setDeletingItem] = useState<ServiceOrderItem | null>(
		null,
	);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [isCompleteModalVisible, setIsCompleteModalVisible] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeletingItem, setIsDeletingItem] = useState(false);

	const { invites: inviteTargetItemInvites } = useItemInvites(
		inviteTargetItem?.id ?? '',
		refreshToken,
	);

	const {
		services: additionalServices,
		isLoading: isLoadingAdditionalServices,
		error: additionalServicesError,
	} = useAdditionalServices(serviceOrder?.quote_id ?? '', refreshToken);

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

	async function handleCompleteAdditionalService(service: AdditionalService) {
		try {
			await updateAdditionalServiceStatus(service.id, 'approved');
			showToast('Serviço adicional concluído com sucesso!', 'success');
			setRefreshToken((current) => current + 1);
		} catch (completeError) {
			showToast(
				completeError instanceof Error
					? completeError.message
					: 'Não foi possível concluir o serviço adicional.',
				'error',
			);
			throw completeError;
		}
	}

	async function handleDeleteItem() {
		if (!serviceOrder || !deletingItem) return;

		setIsDeletingItem(true);
		try {
			await deleteServiceOrderItem(serviceOrder.id, deletingItem.id);
			setDeletingItem(null);
			await refresh();
			showToast('Item excluído com sucesso!', 'success');
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir o item.',
				'error',
			);
		} finally {
			setIsDeletingItem(false);
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
							onDelete={() => setIsDeleteConfirmVisible(true)}
							canComplete={canCompleteOrder(
								serviceOrder.status,
								serviceOrder.files,
								serviceOrder.items,
							)}
							onComplete={() => setIsCompleteModalVisible(true)}
							onViewChange={setView}
						/>

						{view === 'detalhes' && (
							<View key="view-detalhes">
								<ServiceOrderDetailTabs
									selected={detailTab}
									onSelect={setDetailTab}
									reviewCount={
										pendingReviewDeliveries(serviceOrder.files).length
									}
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
											onDeleteItem={setDeletingItem}
										/>
									)}

									{detailTab === 'adicionais' && (
										<AdditionalServicesTab
											services={additionalServices}
											isLoading={isLoadingAdditionalServices}
											error={additionalServicesError}
											onAddService={() =>
												setIsAdditionalServiceModalVisible(true)
											}
											onEditService={setEditingAdditionalService}
											onCompleteService={handleCompleteAdditionalService}
									{detailTab === 'revisao' && (
										<ItemReviewTab
											items={serviceOrder.items}
											files={serviceOrder.files}
											translatorsById={translatorsById}
											onApprove={async (file) => {
												try {
													await approveServiceOrderFile(
														serviceOrder.id,
														file.id,
													);
													await refresh();
													showToast('Entrega aprovada com sucesso!', 'success');
												} catch (reviewError) {
													showToast(
														reviewError instanceof Error
															? reviewError.message
															: 'Não foi possível aprovar a entrega.',
														'error',
													);
												}
											}}
											onRequestChanges={async (file, note) => {
												try {
													await requestServiceOrderFileChanges(
														serviceOrder.id,
														file.id,
														note,
													);
													await refresh();
													showToast(
														'Ajustes solicitados ao tradutor.',
														'success',
													);
													return true;
												} catch (reviewError) {
													showToast(
														reviewError instanceof Error
															? reviewError.message
															: 'Não foi possível enviar o pedido de ajustes.',
														'error',
													);
													return false;
												}
											}}
										/>
									)}

									{detailTab === 'arquivos' && (
										<ServiceOrderFilesTab
											items={serviceOrder.items}
											files={serviceOrder.files}
											onUpload={async (file, direction) => {
												try {
													const uploadedFile = await uploadServiceOrderFile(
														serviceOrder.id,
														file,
														direction,
													);
													const refreshedOrder = await refresh();
													if (refreshedOrder) setServiceOrder(refreshedOrder);
													showToast('Arquivo enviado com sucesso!', 'success');
													return uploadedFile;
												} catch (submitError) {
													showToast(
														submitError instanceof Error
															? submitError.message
															: 'Não foi possível enviar o arquivo.',
														'error',
													);
													throw submitError;
												}
											}}
											onDelete={async (target) => {
												try {
													if (target.kind === 'file') {
														await deleteServiceOrderFile(
															serviceOrder.id,
															target.id,
														);
													} else {
														await deleteServiceOrderItemFile(
															serviceOrder.id,
															target.id,
														);
													}
													await refresh();
													showToast(
														'Documento excluído com sucesso!',
														'success',
													);
												} catch (submitError) {
													showToast(
														submitError instanceof Error
															? submitError.message
															: 'Não foi possível excluir o documento.',
														'error',
													);
													throw submitError;
												}
											}}
										/>
									)}
								</View>
							</View>
						)}

						{view === 'workflow' && (
							<View key="view-workflow" className="gap-5 py-7">
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
				toast={inviteTargetItem ? toast : null}
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

			<AdditionalServiceFormModal
				visible={
					isAdditionalServiceModalVisible || editingAdditionalService !== null
				}
				service={editingAdditionalService}
				onClose={() => {
					setIsAdditionalServiceModalVisible(false);
					setEditingAdditionalService(null);
				}}
				onSubmit={async (data) => {
					if (!serviceOrder) return;

					try {
						if (editingAdditionalService) {
							await updateAdditionalService(editingAdditionalService.id, data);
							showToast('Serviço adicional atualizado com sucesso!', 'success');
						} else {
							await createAdditionalService({
								...data,
								quote_id: serviceOrder.quote_id,
							});
							showToast('Serviço adicional cadastrado com sucesso!', 'success');
						}
						setRefreshToken((current) => current + 1);
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível salvar o serviço adicional.',
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
				visible={deletingItem !== null}
				title="Excluir item"
				message={`Tem certeza que deseja excluir o item ${deletingItem?.source_language ?? ''} → ${deletingItem?.target_language ?? ''}? Essa ação não pode ser desfeita.`}
				confirmLabel="Excluir"
				destructive
				isLoading={isDeletingItem}
				onConfirm={handleDeleteItem}
				onCancel={() => setDeletingItem(null)}
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

			{serviceOrder && (
				<CompleteServiceOrderModal
					visible={isCompleteModalVisible}
					serviceOrder={serviceOrder}
					customerName={company?.trade_name}
					onClose={() => setIsCompleteModalVisible(false)}
					onSent={() => {
						setIsCompleteModalVisible(false);
						refresh();
						showToast('Documentos enviados ao cliente com sucesso!', 'success');
					}}
					onCompleted={() => {
						setIsCompleteModalVisible(false);
						refresh();
						showToast('Ordem de serviço finalizada com sucesso!', 'success');
					}}
				/>
			)}

			<Toast
				toast={
					inviteTargetItem ||
					isAddItemModalVisible ||
					isAdditionalServiceModalVisible ||
					editingAdditionalService ||
					editingItem ||
					isDeleteConfirmVisible ||
					deletingItem
						? null
						: toast
				}
			/>
		</View>
	);
}
