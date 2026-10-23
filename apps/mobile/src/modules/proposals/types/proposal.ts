export type ProposalStatus = 'pending' | 'approved' | 'reproved';

export type ProposalSortField =
	| 'created_at'
	| 'status'
	| 'customer_name'
	| 'enterprise';

export type Proposal = {
	id: string;
	customer_name: string | null;
	enterprise: string | null;
	translation_service: string | null;
	total_value: number | string;
	status: ProposalStatus;
	created_at: string;
};

export type ProposalPage = {
	items: Proposal[];
	total: number;
	page: number;
	page_size: number;
};

export type ProposalFilters = {
	startDate: string;
	endDate: string;
	status: ProposalStatus | 'all';
	orderBy: ProposalSortField;
	orderDir: 'asc' | 'desc';
	page: number;
};
