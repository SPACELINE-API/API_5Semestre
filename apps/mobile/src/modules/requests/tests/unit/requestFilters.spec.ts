import { expect, test } from '@playwright/test';
import type { RequestItem } from '../../services/requests';
import {
	filterRequests,
	paginate,
	totalPagesFor,
} from '../../utils/requestFilters';

function request(overrides: Partial<RequestItem>): RequestItem {
	return {
		id: 'a1b2c3d4',
		customer_name: 'Maria Souza',
		enterprise: 'Rezende Advogados',
		email: 'maria@rezende.com',
		original_language: 'Inglês',
		translation_language: 'Português',
		customer_need: 'Contrato social',
		status: 'pending',
		request_date: '2026-11-21',
		has_document: true,
		...overrides,
	};
}

const requests = [
	request({ id: '1', customer_name: 'Maria Souza', status: 'pending' }),
	request({
		id: '2',
		customer_name: 'João Pereira',
		enterprise: 'Aliança Logística',
		email: 'joao@alianca.com',
		customer_need: 'Certidão de nascimento',
		status: 'approved',
	}),
	request({
		id: '3',
		customer_name: 'Ana Lima',
		enterprise: 'Studio Lima',
		email: 'ana@studiolima.com',
		translation_language: 'Espanhol',
		status: 'reproved',
	}),
];

test.describe('filterRequests', () => {
	test('returns everything without search or status', () => {
		expect(filterRequests(requests, '', 'all')).toHaveLength(3);
	});

	test('filters by status', () => {
		expect(
			filterRequests(requests, '', 'approved').map((item) => item.id),
		).toEqual(['2']);
	});

	test('searches name, company, email, document and language ignoring accents and case', () => {
		expect(filterRequests(requests, 'joao', 'all').map((i) => i.id)).toEqual([
			'2',
		]);
		expect(filterRequests(requests, 'ALIANCA', 'all').map((i) => i.id)).toEqual(
			['2'],
		);
		expect(
			filterRequests(requests, 'certidao', 'all').map((i) => i.id),
		).toEqual(['2']);
		expect(
			filterRequests(requests, 'espanhol', 'all').map((i) => i.id),
		).toEqual(['3']);
	});

	test('requires every search term to match', () => {
		expect(filterRequests(requests, 'maria rezende', 'all')).toHaveLength(1);
		expect(filterRequests(requests, 'maria studio', 'all')).toHaveLength(0);
	});

	test('combines search and status', () => {
		expect(filterRequests(requests, 'maria', 'approved')).toHaveLength(0);
		expect(filterRequests(requests, 'maria', 'pending')).toHaveLength(1);
	});
});

test.describe('pagination helpers', () => {
	const items = Array.from({ length: 23 }, (_, index) => index + 1);

	test('computes the total of pages with a minimum of one', () => {
		expect(totalPagesFor(0)).toBe(1);
		expect(totalPagesFor(10)).toBe(1);
		expect(totalPagesFor(23)).toBe(3);
	});

	test('returns the requested page and clamps out of range pages', () => {
		expect(paginate(items, 1)).toHaveLength(10);
		expect(paginate(items, 3)).toEqual([21, 22, 23]);
		expect(paginate(items, 99)).toEqual([21, 22, 23]);
		expect(paginate(items, 0)[0]).toBe(1);
	});
});
