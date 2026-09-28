export type Contact = {
	id: string;
	name: string;
	email: string;
	phone: string;
	department: string;
	company_id: string;
	created_at: string;
	updated_at: string;
};

export type ContactCreateInput = {
	name: string;
	email: string;
	phone: string;
	department: string;
	company_id: string;
};

export type ContactUpdateInput = Partial<ContactCreateInput>;
