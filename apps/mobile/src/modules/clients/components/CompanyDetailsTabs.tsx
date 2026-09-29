import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { Company } from '../types/company';
import type { Contact } from '../../contacts/types/contact';
import { CompanyDetailsContactsTab } from './CompanyDetailsContactsTab';
import { CompanyDetailsInfoTab } from './CompanyDetailsInfoTab';
import { CompanyDetailsProjectsTab } from './CompanyDetailsProjectsTab';

export type CompanyDetailsTab = 'info' | 'clients' | 'projects';

const TABS: { key: CompanyDetailsTab; label: string }[] = [
	{ key: 'info', label: 'Informações' },
	{ key: 'clients', label: 'Funcionários' },
	{ key: 'projects', label: 'Projetos' },
];

type CompanyDetailsTabsProps = {
	company: Company;
	contacts: Contact[];
	activeTab: CompanyDetailsTab;
	onTabChange: (tab: CompanyDetailsTab) => void;
	onAddContact: () => void;
	onEditContact: (contact: Contact) => void;
	onDeleteContact: (contact: Contact) => void;
};

export function CompanyDetailsTabs({
	company,
	contacts,
	activeTab,
	onTabChange,
	onAddContact,
	onEditContact,
	onDeleteContact,
}: CompanyDetailsTabsProps) {
	return (
		<>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className="border-b border-gray-200"
				contentContainerClassName="flex-row gap-7"
			>
				{TABS.map((tab) => {
					const isSelected = tab.key === activeTab;

					return (
						<TouchableOpacity
							key={tab.key}
							onPress={() => onTabChange(tab.key)}
							activeOpacity={0.7}
							className={`border-b-2 py-3 ${
								isSelected ? 'border-blue-600' : 'border-transparent'
							}`}
						>
							<Text
								className={`font-inter text-sm ${
									isSelected
										? 'font-semibold text-blue-600'
										: 'font-medium text-gray-400'
								}`}
							>
								{tab.label}
							</Text>
						</TouchableOpacity>
					);
				})}
			</ScrollView>

			<View className="py-7">
				{activeTab === 'info' && <CompanyDetailsInfoTab company={company} />}
				{activeTab === 'clients' && (
					<CompanyDetailsContactsTab
						contacts={contacts}
						onAdd={onAddContact}
						onEdit={onEditContact}
						onDelete={onDeleteContact}
					/>
				)}
				{activeTab === 'projects' && <CompanyDetailsProjectsTab />}
			</View>
		</>
	);
}
