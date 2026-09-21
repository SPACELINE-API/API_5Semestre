import { useCallback, useEffect, useState } from 'react';
import { listContacts } from '../services/contactService';
import type { Contact } from '../types/contact';

export function useContactsByCompany(companyId: string | undefined) {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [isLoadingContacts, setIsLoadingContacts] = useState(true);
	const [contactsError, setContactsError] = useState<string | null>(null);

	const refreshContacts = useCallback(async () => {
		if (!companyId) return;
		setIsLoadingContacts(true);
		setContactsError(null);

		try {
			const allContacts = await listContacts();
			const filteredContacts = allContacts.filter(
				(c) => c.company_id === companyId,
			);
			setContacts(filteredContacts);
		} catch {
			setContactsError('Não foi possível carregar os contatos.');
		} finally {
			setIsLoadingContacts(false);
		}
	}, [companyId]);

	useEffect(() => {
		refreshContacts();
	}, [refreshContacts]);

	return {
		contacts,
		isLoadingContacts,
		contactsError,
		refreshContacts,
		setContacts,
	};
}
