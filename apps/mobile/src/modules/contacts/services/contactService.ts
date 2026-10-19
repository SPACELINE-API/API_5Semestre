import {
	apiDeleteAuth,
	apiGetAuth,
	apiPatchAuth,
	apiPostAuth,
} from '../../../shared/services/apiClient';
import type {
	Contact,
	ContactCreateInput,
	ContactUpdateInput,
} from '../types/contact';

const CONTACTS_PATH = '/api/contacts';

export function listContacts(): Promise<Contact[]> {
	return apiGetAuth<Contact[]>(CONTACTS_PATH);
}

export function createContact(data: ContactCreateInput): Promise<Contact> {
	return apiPostAuth<Contact, ContactCreateInput>(CONTACTS_PATH, data);
}

export function getContact(id: string): Promise<Contact> {
	return apiGetAuth<Contact>(`${CONTACTS_PATH}/${id}`);
}

export function updateContact(
	id: string,
	data: Partial<ContactUpdateInput>,
): Promise<Contact> {
	return apiPatchAuth<Contact, Partial<ContactUpdateInput>>(
		`${CONTACTS_PATH}/${id}`,
		data,
	);
}

export function deleteContact(id: string): Promise<void> {
	return apiDeleteAuth(`${CONTACTS_PATH}/${id}`);
}
