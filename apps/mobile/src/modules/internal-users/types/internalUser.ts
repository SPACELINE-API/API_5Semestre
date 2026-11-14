export type LinkStatus = 'pendente' | 'aceito' | 'rejeitado' | 'expirado';

export type InternalUserLink = {
	status: LinkStatus;
	sent_at: string;
	expires_at: string;
	used_at: string | null;
};

export type InternalUserRole = {
	id: string;
	name: string;
};

export type InternalUser = {
	id: string;
	name: string | null;
	email: string;
	phone: string | null;
	is_active: boolean;
	status: 'ativa' | 'inativa';
	password_defined: boolean;
	roles: InternalUserRole[];
	permissions: string[];
	latest_link: InternalUserLink | null;
	created_at: string;
	updated_at: string;
};

export type InternalUserCreateInput = {
	name: string;
	email: string;
	phone: string;
	role_ids: string[];
};

export type InternalUserUpdateInput = {
	name?: string;
	email?: string;
	phone?: string;
};

export type Department = {
	key: string;
	name: string;
	people: InternalUser[];
};

export type StatusFilter = 'all' | 'ativa' | 'inativa';
