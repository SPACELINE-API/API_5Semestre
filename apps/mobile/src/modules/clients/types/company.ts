export type Company = {
	id: string;
	legal_name: string;
	trade_name: string;
	cnpj: string;
	is_active: boolean;
	industry: string;
	phone: string;
	email: string;
	zip_code: string;
	street: string;
	number: string;
	complement: string | null;
	neighborhood: string;
	city: string;
	state: string;
	created_at: string;
	updated_at: string;
};

export type CompanyCreateInput = {
	legal_name: string;
	trade_name: string;
	cnpj: string;
	industry: string;
	phone: string;
	email: string;
	zip_code: string;
	street: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
};

export type CompanyUpdateInput = CompanyCreateInput & {
	is_active: boolean;
};
