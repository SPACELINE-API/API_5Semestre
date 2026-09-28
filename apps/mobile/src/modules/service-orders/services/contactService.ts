import { apiGet } from '../../../shared/services/apiClient';
import type { Contact } from '../types/serviceOrder';

export function listContacts() {
	return apiGet<Contact[]>('/api/contacts');
}
