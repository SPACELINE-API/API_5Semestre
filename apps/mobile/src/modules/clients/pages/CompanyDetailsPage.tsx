import { useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { AlertCircle, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCompany } from '../hooks/useCompany';
import { CompanyEditModal } from '../components/CompanyEditModal';
import { CompanyDetailsHeader } from '../components/CompanyDetailsHeader';
import {
	CompanyDetailsTabs,
	type CompanyDetailsTab,
} from '../components/CompanyDetailsTabs';
import { deleteCompany, updateCompany } from '../services/companyService';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ContactFormModal } from '../../contacts/components/ContactFormModal';
import {
	createContact,
	deleteContact,
	updateContact,
} from '../../contacts/services/contactService';
import { useContactsByCompany } from '../../contacts/hooks/useContactsByCompany';
import type { Contact } from '../../contacts/types/contact';

type CompanyDetailsPageProps = { id: string };

export function CompanyDetailsPage({ id }: CompanyDetailsPageProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<CompanyDetailsTab>('info');
	const [isEditVisible, setIsEditVisible] = useState(false);
	const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [isContactModalVisible, setIsContactModalVisible] = useState(false);
	const [editingContact, setEditingContact] = useState<Contact | null>(null);
	const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
	const [isDeletingContact, setIsDeletingContact] = useState(false);
	const { company, isLoading, error, setCompany } = useCompany(id);
	const { contacts, refreshContacts } = useContactsByCompany(company?.id);
	const { toast, showToast } = useToast();

	async function handleDelete() {
		if (!company) return;
		setIsDeleting(true);
		try {
			await deleteCompany(company.id);
			router.replace('/clientes?deleted=1');
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

	async function handleDeleteContact() {
		if (!contactToDelete) return;
		setIsDeletingContact(true);
		try {
			await deleteContact(contactToDelete.id);
			showToast('Contato excluído com sucesso!', 'success');
			refreshContacts();
		} catch (deleteError) {
			showToast(
				deleteError instanceof Error
					? deleteError.message
					: 'Não foi possível excluir o contato.',
				'error',
			);
		} finally {
			setIsDeletingContact(false);
			setContactToDelete(null);
		}
	}

	function openContactForm(contact: Contact | null = null) {
		setEditingContact(contact);
		setIsContactModalVisible(true);
	}

	async function saveCompany(data: Parameters<typeof updateCompany>[1]) {
		if (!company) return;
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
	}

	async function saveContact(data: Parameters<typeof createContact>[0]) {
		try {
			if (editingContact) {
				await updateContact(editingContact.id, data);
				showToast('Contato atualizado com sucesso!', 'success');
			} else {
				await createContact(data);
				showToast('Contato adicionado com sucesso!', 'success');
			}
			setIsContactModalVisible(false);
			setEditingContact(null);
			refreshContacts();
		} catch (submitError) {
			showToast(
				submitError instanceof Error
					? submitError.message
					: 'Não foi possível salvar o contato.',
				'error',
			);
			throw submitError;
		}
	}

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-6 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
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
						<CompanyDetailsHeader
							company={company}
							contactCount={contacts.length}
							onEdit={() => setIsEditVisible(true)}
							onDelete={() => setIsDeleteConfirmVisible(true)}
						/>
						<CompanyDetailsTabs
							company={company}
							contacts={contacts}
							activeTab={activeTab}
							onTabChange={setActiveTab}
							onAddContact={() => openContactForm()}
							onEditContact={openContactForm}
							onDeleteContact={setContactToDelete}
						/>
					</View>
				)}
			</ScrollView>

			{company && (
				<CompanyEditModal
					visible={isEditVisible}
					company={company}
					onClose={() => setIsEditVisible(false)}
					onSubmit={saveCompany}
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
			{company && (
				<ContactFormModal
					visible={isContactModalVisible}
					companyId={company.id}
					contact={editingContact}
					onClose={() => {
						setIsContactModalVisible(false);
						setEditingContact(null);
					}}
					onSubmit={saveContact}
					toast={toast}
				/>
			)}
			<ConfirmDialog
				visible={!!contactToDelete}
				title="Excluir funcionário"
				message={`Tem certeza que deseja excluir "${contactToDelete?.name}"?`}
				confirmLabel="Excluir"
				destructive
				isLoading={isDeletingContact}
				onConfirm={handleDeleteContact}
				onCancel={() => setContactToDelete(null)}
			/>
			<Toast
				toast={
					isEditVisible ||
					isDeleteConfirmVisible ||
					isContactModalVisible ||
					!!contactToDelete
						? null
						: toast
				}
			/>
		</View>
	);
}
