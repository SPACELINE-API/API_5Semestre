import { Pencil, Trash2, UserPlus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Contact } from '../../contacts/types/contact';

type ContactAction = (contact: Contact) => void;

function TableHeaderCell({
	label,
	flex = 1,
	hideOnMobile = false,
}: {
	label: string;
	flex?: number;
	hideOnMobile?: boolean;
}) {
	return (
		<View style={{ flex }} className={hideOnMobile ? 'hidden md:flex' : ''}>
			<Text className="font-inter text-gray-400 text-xs">{label}</Text>
		</View>
	);
}

function ContactRow({
	contact,
	isFirst,
	onEdit,
	onDelete,
}: {
	contact: Contact;
	isFirst: boolean;
	onEdit: ContactAction;
	onDelete: ContactAction;
}) {
	return (
		<View
			className={`flex-row items-center py-3.5 ${
				isFirst ? '' : 'border-t border-gray-100'
			}`}
		>
			<View style={{ flex: 2 }} className="flex-row items-center gap-2.5 pr-3">
				<View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100">
					<Text className="font-inter font-semibold text-gray-500 text-[11px]">
						{contact.name[0]?.toUpperCase() ?? '?'}
					</Text>
				</View>
				<View className="min-w-0 flex-1">
					<Text
						className="font-inter font-medium text-gray-800 text-sm"
						numberOfLines={1}
					>
						{contact.name}
					</Text>
					<Text
						className="mt-0.5 font-inter text-gray-400 text-xs md:hidden"
						numberOfLines={1}
					>
						{contact.email}
					</Text>
				</View>
			</View>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-gray-500 text-sm md:flex"
			>
				{contact.department}
			</Text>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-gray-500 text-sm md:flex"
				numberOfLines={1}
			>
				{contact.email}
			</Text>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-gray-500 text-sm md:flex"
			>
				{contact.phone}
			</Text>
			<View className="w-[60px] flex-row items-center justify-end gap-3">
				<TouchableOpacity
					onPress={() => onEdit(contact)}
					activeOpacity={0.7}
					hitSlop={8}
				>
					<Pencil size={14} color="#6B7280" />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => onDelete(contact)}
					activeOpacity={0.7}
					hitSlop={8}
				>
					<Trash2 size={14} color="#DC2626" />
				</TouchableOpacity>
			</View>
		</View>
	);
}

export function CompanyDetailsContactsTab({
	contacts,
	onAdd,
	onEdit,
	onDelete,
}: {
	contacts: Contact[];
	onAdd: () => void;
	onEdit: ContactAction;
	onDelete: ContactAction;
}) {
	return (
		<View>
			<View className="flex-row items-center justify-end pb-3">
				<TouchableOpacity
					onPress={onAdd}
					activeOpacity={0.7}
					className="flex-row items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2"
				>
					<UserPlus size={14} color="#353535" />
					<Text className="font-inter font-semibold text-gray-800 text-xs">
						Adicionar funcionário
					</Text>
				</TouchableOpacity>
			</View>

			<View className="flex-row items-center border-b border-gray-100 pb-3">
				<TableHeaderCell label="Nome" flex={2} />
				<TableHeaderCell label="Departamento" hideOnMobile />
				<TableHeaderCell label="Email" hideOnMobile />
				<TableHeaderCell label="Telefone" hideOnMobile />
				<View className="w-[60px]" />
			</View>

			{contacts.map((contact, index) => (
				<ContactRow
					key={contact.id}
					contact={contact}
					isFirst={index === 0}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</View>
	);
}
