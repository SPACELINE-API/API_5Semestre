import { Pencil, Trash2, UserPlus } from 'lucide-react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Contact } from '../../contacts/types/contact';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
			<Text className="font-inter text-foreground-subtle text-xs">{label}</Text>
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
	const themeColors = useThemeColors();
	const canWriteContacts = usePermission('contacts.write');

	return (
		<View
			className={`flex-row items-center py-3.5 ${
				isFirst ? '' : 'border-t border-border-subtle'
			}`}
		>
			<View style={{ flex: 2 }} className="flex-row items-center gap-2.5 pr-3">
				<View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted">
					<Text className="font-inter font-semibold text-foreground-muted text-[11px]">
						{contact.name[0]?.toUpperCase() ?? '?'}
					</Text>
				</View>
				<View className="min-w-0 flex-1">
					<Text
						className="font-inter font-medium text-foreground text-sm"
						numberOfLines={1}
					>
						{contact.name}
					</Text>
					<Text
						className="mt-0.5 font-inter text-foreground-subtle text-xs md:hidden"
						numberOfLines={1}
					>
						{contact.email}
					</Text>
				</View>
			</View>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-foreground-muted text-sm md:flex"
			>
				{contact.department}
			</Text>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-foreground-muted text-sm md:flex"
				numberOfLines={1}
			>
				{contact.email}
			</Text>
			<Text
				style={{ flex: 1 }}
				className="hidden font-inter text-foreground-muted text-sm md:flex"
			>
				{contact.phone}
			</Text>
			<View className="w-[60px] flex-row items-center justify-end gap-3">
				<TouchableOpacity
					onPress={() => onEdit(contact)}
					disabled={!canWriteContacts}
					style={{ opacity: canWriteContacts ? 1 : 0.4 }}
					activeOpacity={0.7}
					hitSlop={8}
				>
					<Pencil size={14} color={themeColors.foregroundMuted} />
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => onDelete(contact)}
					disabled={!canWriteContacts}
					style={{ opacity: canWriteContacts ? 1 : 0.4 }}
					activeOpacity={0.7}
					hitSlop={8}
				>
					<Trash2 size={14} color={themeColors.danger} />
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
	const themeColors = useThemeColors();
	const canWriteContacts = usePermission('contacts.write');

	return (
		<View>
			<View className="flex-row items-center justify-end pb-3">
				<TouchableOpacity
					onPress={onAdd}
					disabled={!canWriteContacts}
					activeOpacity={0.7}
					className={`flex-row items-center gap-1.5 rounded-lg border border-border-strong px-3 py-2 ${!canWriteContacts ? 'opacity-40' : ''}`}
				>
					<UserPlus size={14} color={themeColors.foreground} />
					<Text className="font-inter font-semibold text-foreground text-xs">
						Adicionar funcionário
					</Text>
				</TouchableOpacity>
			</View>

			<View className="flex-row items-center border-b border-border-subtle pb-3">
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
