import {
	apiDelete,
	apiGet,
	apiPatch,
	apiPost,
} from '../../../shared/services/apiClient';
import type {
	Contact,
	ContactCreateInput,
	ContactUpdateInput,
} from '../types/contact';

const CONTACTS_PATH = '/api/contacts';

export function listContacts(): Promise<Contact[]> {
	return apiGet<Contact[]>(CONTACTS_PATH);
}

export function createContact(data: ContactCreateInput): Promise<Contact> {
	return apiPost<Contact, ContactCreateInput>(CONTACTS_PATH, data);
}

export function getContact(id: string): Promise<Contact> {
	return apiGet<Contact>(`${CONTACTS_PATH}/${id}`);
}

export function updateContact(
	id: string,
	data: Partial<ContactUpdateInput>,
): Promise<Contact> {
	return apiPatch<Contact, Partial<ContactUpdateInput>>(
		`${CONTACTS_PATH}/${id}`,
		data,
	);
}

export function deleteContact(id: string): Promise<void> {
	return apiDelete(`${CONTACTS_PATH}/${id}`);
}
