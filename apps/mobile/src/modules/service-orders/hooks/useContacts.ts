import { useCallback, useEffect, useState } from 'react';
import { listContacts } from '../services/contactService';
import type { Contact } from '../types/serviceOrder';
import { usePermission } from '../../auth/hooks/usePermission';

export function useContacts() {
	const canReadContacts = usePermission('contacts.read');
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!canReadContacts) {
			setContacts([]);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const data = await listContacts();
			setContacts(data);
		} catch {
			setError('Não foi possível carregar os contatos.');
		} finally {
			setIsLoading(false);
		}
	}, [canReadContacts]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { contacts, isLoading, error, refresh };
}
