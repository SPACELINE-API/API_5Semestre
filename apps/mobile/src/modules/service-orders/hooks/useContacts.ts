import { useCallback, useEffect, useState } from 'react';
import { listContacts } from '../services/contactService';
import type { Contact } from '../types/serviceOrder';

export function useContacts() {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
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
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	return { contacts, isLoading, error, refresh };
}
