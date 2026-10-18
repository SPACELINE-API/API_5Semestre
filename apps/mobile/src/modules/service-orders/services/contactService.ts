import { apiGetAuth } from '../../../shared/services/apiClient';
import type { Contact } from '../types/serviceOrder';

export function listContacts() {
	return apiGetAuth<Contact[]>('/api/contacts');
}
