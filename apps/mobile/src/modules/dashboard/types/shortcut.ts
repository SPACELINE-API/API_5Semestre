export type DashboardShortcut = {
	id: string;
	title: string;
	description: string;
	route: string;
	permission: string;
	category: string;
};

export type DashboardMetric = {
	id: string;
	title: string;
	value: number | string;
	description: string;
	badge?: string;
	badgeType?: 'warning' | 'info' | 'success' | 'neutral';
	route?: string;
	icon:
		| 'invites'
		| 'requests'
		| 'quotes'
		| 'service-orders'
		| 'clients'
		| 'translators'
		| 'check';
};

export type DashboardData = {
	shortcuts: DashboardShortcut[];
	metrics: DashboardMetric[];
	user: { id: string; email: string };
	roles: { id: string; name: string }[];
};
