export type PeriodKey = '7d' | '30d' | '90d' | 'year';

/** Datas no formato YYYY-MM-DD (fuso local). */
export type PeriodRange = {
	start: string;
	end: string;
};

export type StatusBucket = {
	status: string;
	label: string;
	count: number;
	/** Valor total (R$) dos registros no status. Null quando a entidade não tem valor. */
	amount: number | null;
};

export type OverviewGroup = {
	id: 'quotes' | 'service-orders' | 'requests' | string;
	title: string;
	/** Se false, a UI esconde valores e o seletor "Quantidade | Valor". */
	hasAmount: boolean;
	statuses: StatusBucket[];
};

export type DashboardOverview = {
	groups: OverviewGroup[];
};
