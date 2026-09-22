export type ServiceOrderItemStatus =
	'pendente' | 'em_andamento' | 'em_analise' | 'concluida';

export type ServiceOrderItem = {
	id: string;
	service_order_id: string;
	quote_translation_item_id: string | null;
	translator_id: string | null;
	source_language: string;
	target_language: string;
	document_type: string | null;
	file_url: string | null;
	word_count: number | null;
	price: string | null;
	deadline: string | null;
	status: ServiceOrderItemStatus;
	created_at: string;
	updated_at: string;
};

export type CreateServiceOrderItemInput = {
	source_language: string;
	target_language: string;
	document_type?: string | null;
	word_count?: number | null;
	price?: number | null;
	deadline?: string | null;
};

export type UpdateServiceOrderItemInput = {
	source_language: string;
	target_language: string;
	document_type?: string | null;
	word_count?: number | null;
	price?: number | null;
	deadline?: string | null;
};

export type ServiceOrderFileDirection = 'entrada' | 'saida';

export type ServiceOrderFile = {
	id: string;
	service_order_id: string;
	filename: string;
	file_url: string;
	direction: ServiceOrderFileDirection;
	uploaded_at: string;
};

export type ServiceOrder = {
	id: string;
	quote_id: string;
	company_id: string;
	project_name: string;
	deadline: string | null;
	domain_area: string | null;
	price_category: string | null;
	internal_notes: string | null;
	external_notes: string | null;
	status: ServiceOrderItemStatus;
	items: ServiceOrderItem[];
	files: ServiceOrderFile[];
	created_at: string;
	updated_at: string;
};

export type GenerateServiceOrderInput = {
	quote_id: string;
	company_id: string;
	project_name: string;
	deadline?: string | null;
	domain_area?: string | null;
	price_category?: string | null;
	internal_notes?: string | null;
	external_notes?: string | null;
};

export type UpdateServiceOrderInput = {
	project_name?: string;
	deadline?: string | null;
	domain_area?: string | null;
	price_category?: string | null;
	internal_notes?: string | null;
	external_notes?: string | null;
};

export type InviteStatus = 'pendente' | 'aceito' | 'recusado' | 'expirado';

export type ServiceOrderItemInvite = {
	id: string;
	service_order_item_id: string;
	translator_id: string;
	status: InviteStatus;
	sent_at: string;
	responded_at: string | null;
};

export type Translator = {
	id: string;
	name: string;
	email: string;
	phone: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
};

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
