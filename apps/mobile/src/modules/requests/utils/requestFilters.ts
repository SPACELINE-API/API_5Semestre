import type { RequestItem, RequestStatus } from '../services/requests';

export type RequestStatusFilter = 'all' | RequestStatus;

export const REQUESTS_PAGE_SIZE = 10;

export const REQUEST_STATUS_OPTIONS: {
	value: RequestStatusFilter;
	label: string;
}[] = [
	{ value: 'all', label: 'Todas' },
	{ value: 'pending', label: 'Pendentes' },
	{ value: 'approved', label: 'Aprovadas' },
	{ value: 'reproved', label: 'Reprovadas' },
];

function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function searchableText(request: RequestItem): string {
	return normalizeText(
		[
			request.id,
			request.customer_name,
			request.enterprise,
			request.email,
			request.customer_need,
			request.original_language,
			request.translation_language,
			request.document_filename ?? '',
		].join(' '),
	);
}

export function filterRequests(
	requests: RequestItem[],
	search: string,
	status: RequestStatusFilter,
): RequestItem[] {
	const terms = normalizeText(search).split(/\s+/).filter(Boolean);
	return requests.filter((request) => {
		if (status !== 'all' && request.status !== status) return false;
		if (terms.length === 0) return true;
		const haystack = searchableText(request);
		return terms.every((term) => haystack.includes(term));
	});
}

export function totalPagesFor(
	count: number,
	pageSize: number = REQUESTS_PAGE_SIZE,
): number {
	return Math.max(1, Math.ceil(count / pageSize));
}

export function paginate<T>(
	items: T[],
	page: number,
	pageSize: number = REQUESTS_PAGE_SIZE,
): T[] {
	const safePage = Math.min(
		Math.max(1, page),
		totalPagesFor(items.length, pageSize),
	);
	const start = (safePage - 1) * pageSize;
	return items.slice(start, start + pageSize);
}
