import { apiGetAuth } from '../../../shared/services/apiClient';
import { fetchRequests } from '../../requests/services/requests';
import { listServiceOrders } from '../../service-orders/services/serviceOrderService';
import type {
	DashboardOverview,
	OverviewGroup,
	PeriodRange,
	StatusBucket,
} from '../types/overview';

const MAX_QUOTE_PAGES = 30;

type Row = { status: string; amount: number; date: unknown };

const toNumber = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

function humanize(status: string) {
	const text = status.replace(/[_-]+/g, ' ').trim();
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Registros sem data válida são mantidos (não há como filtrá-los). */
function inRange(value: unknown, range: PeriodRange) {
	if (!value) return true;
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return true;
	const [sy, sm, sd] = range.start.split('-').map(Number);
	const [ey, em, ed] = range.end.split('-').map(Number);
	return (
		date >= new Date(sy, sm - 1, sd, 0, 0, 0, 0) &&
		date <= new Date(ey, em - 1, ed, 23, 59, 59, 999)
	);
}

function toBuckets(
	rows: Row[],
	range: PeriodRange,
	labels: Record<string, string>,
	hasAmount: boolean,
	fixedOrder: string[] = [],
): StatusBucket[] {
	const map = new Map<string, StatusBucket>();
	const ensure = (status: string) => {
		let bucket = map.get(status);
		if (!bucket) {
			bucket = {
				status,
				label: labels[status] ?? humanize(status),
				count: 0,
				amount: hasAmount ? 0 : null,
			};
			map.set(status, bucket);
		}
		return bucket;
	};
	fixedOrder.forEach(ensure);
	rows
		.filter((row) => inRange(row.date, range))
		.forEach((row) => {
			const bucket = ensure(row.status);
			bucket.count += 1;
			if (hasAmount) bucket.amount = (bucket.amount ?? 0) + row.amount;
		});
	return [...map.values()];
}

async function loadQuotes(range: PeriodRange): Promise<OverviewGroup> {
	type QuoteRow = { status: string; total_value: unknown; created_at: unknown };
	const all: QuoteRow[] = [];
	let page = 1;
	let totalPages;
	do {
		const res = await apiGetAuth<{ items: QuoteRow[]; total_pages?: number }>(
			`/api/quotes?page=${page}`,
		);
		all.push(...(res.items ?? []));
		totalPages = res.total_pages ?? 1;
		page += 1;
	} while (page <= totalPages && page <= MAX_QUOTE_PAGES);

	return {
		id: 'quotes',
		title: 'Orçamentos',
		hasAmount: true,
		statuses: toBuckets(
			all.map((q) => ({
				status: q.status,
				amount: toNumber(q.total_value),
				date: q.created_at,
			})),
			range,
			{ pending: 'Em aberto', approved: 'Aprovados', reproved: 'Reprovados' },
			true,
			['pending', 'approved', 'reproved'],
		),
	};
}

async function loadServiceOrders(range: PeriodRange): Promise<OverviewGroup> {
	type OrderRow = {
		status: string;
		created_at?: unknown;
		items?: { price?: unknown }[];
	};
	const orders = (await listServiceOrders()) as unknown as OrderRow[];

	return {
		id: 'service-orders',
		title: 'Ordens de serviço',
		hasAmount: true,
		statuses: toBuckets(
			orders.map((o) => ({
				status: o.status,
				amount: (o.items ?? []).reduce((sum, i) => sum + toNumber(i.price), 0),
				date: o.created_at,
			})),
			range,
			{ concluida: 'Concluídas' },
			true,
		),
	};
}

async function loadRequests(range: PeriodRange): Promise<OverviewGroup> {
	type RequestRow = { status: string; created_at?: unknown };
	const requests = (await fetchRequests()) as unknown as RequestRow[];

	return {
		id: 'requests',
		title: 'Requisições',
		hasAmount: false,
		statuses: toBuckets(
			requests.map((r) => ({
				status: r.status,
				amount: 0,
				date: r.created_at,
			})),
			range,
			{ pending: 'Pendentes' },
			false,
			['pending'],
		),
	};
}

const LOADERS: Record<string, (range: PeriodRange) => Promise<OverviewGroup>> =
	{
		quotes: loadQuotes,
		'service-orders': loadServiceOrders,
		requests: loadRequests,
	};

/**
 * @param allowedIds ids dos atalhos autorizados ('quotes', 'service-orders',
 * 'requests'). Evita chamar endpoints que o perfil não pode acessar.
 */
export async function fetchDashboardOverview(
	range: PeriodRange,
	allowedIds: string[],
): Promise<DashboardOverview> {
	const ids = ['requests', 'quotes', 'service-orders'].filter((id) =>
		allowedIds.includes(id),
	);
	const results = await Promise.allSettled(ids.map((id) => LOADERS[id](range)));

	const groups = results.flatMap((r) =>
		r.status === 'fulfilled' ? [r.value] : [],
	);
	if (ids.length > 0 && groups.length === 0) {
		const failed = results.find(
			(r): r is PromiseRejectedResult => r.status === 'rejected',
		);
		throw failed?.reason instanceof Error
			? failed.reason
			: new Error('Não foi possível carregar os dados do período.');
	}
	results.forEach((r) => {
		if (r.status === 'rejected') {
			console.warn('Dashboard: Erro ao carregar overview:', r.reason);
		}
	});
	return { groups };
}
