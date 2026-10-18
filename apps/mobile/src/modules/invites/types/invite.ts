export type InviteStatus = 'pendente' | 'aceito' | 'recusado' | 'expirado';

export type ServiceOrderItemInvite = {
	id: string;
	service_order_item_id: string;
	translator_id: string;
	status: InviteStatus;
	sent_at: string;
	responded_at: string | null;
	item_status?: string | null;
};

export type InviteItemSummary = {
	id: string;
	source_language: string;
	target_language: string;
	document_type: string | null;
	deadline: string | null;
	status: string;
};

export type ServiceOrderItemDetails = InviteItemSummary & {
	file_url: string | null;
	word_count: number | null;
	price: string | null;
};

export type MyInvite = ServiceOrderItemInvite & {
	item: InviteItemSummary;
};

export type MyInviteDetails = ServiceOrderItemInvite & {
	item: ServiceOrderItemDetails;
};
