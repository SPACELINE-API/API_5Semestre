import { test, expect } from '@playwright/test';
import type { InternalUser } from '../../types/internalUser';
import {
	canResendLink,
	canSendInitialLink,
	filterPeople,
	groupByDepartment,
	initials,
	isExternalRoleName,
	syncRoles,
} from '../../utils/departments';

function person(overrides: Partial<InternalUser> = {}): InternalUser {
	return {
		id: 'p1',
		name: 'Ana Souza',
		email: 'ana@example.com',
		phone: '11999990000',
		is_active: false,
		status: 'inativa',
		password_defined: false,
		roles: [{ id: 'r1', name: 'Projetos' }],
		permissions: [],
		latest_link: null,
		created_at: '2026-11-07T10:00:00Z',
		updated_at: '2026-11-07T10:00:00Z',
		...overrides,
	};
}

const link = (status: 'pendente' | 'aceito' | 'rejeitado' | 'expirado') => ({
	status,
	sent_at: '2026-11-07T10:00:00Z',
	expires_at: '2026-11-10T10:00:00Z',
	used_at: null,
});

test.describe('groupByDepartment', () => {
	test('groups people by role, sorted by department and name', () => {
		const people = [
			person({
				id: 'a',
				name: 'Zelia',
				roles: [{ id: 'r2', name: 'Financeiro' }],
			}),
			person({ id: 'b', name: 'Bruno' }),
			person({ id: 'c', name: 'Ana' }),
		];

		const groups = groupByDepartment(people);

		expect(groups.map((group) => group.name)).toEqual([
			'Financeiro',
			'Projetos',
		]);
		expect(groups[1].people.map((item) => item.name)).toEqual(['Ana', 'Bruno']);
	});

	test('lists a person with several roles in every department', () => {
		const both = person({
			roles: [
				{ id: 'r1', name: 'Projetos' },
				{ id: 'r2', name: 'Financeiro' },
			],
		});

		const groups = groupByDepartment([both]);

		expect(groups).toHaveLength(2);
		expect(groups.every((group) => group.people.length === 1)).toBe(true);
	});
});

test.describe('filterPeople', () => {
	const people = [
		person({ id: 'a', name: 'Ana Souza' }),
		person({
			id: 'b',
			name: 'Bruno Alvares',
			email: 'bruno@example.com',
			is_active: true,
			status: 'ativa',
		}),
	];

	test('filters by status', () => {
		expect(filterPeople(people, '', 'ativa').map((item) => item.id)).toEqual([
			'b',
		]);
		expect(filterPeople(people, '', 'inativa').map((item) => item.id)).toEqual([
			'a',
		]);
		expect(filterPeople(people, '', 'all')).toHaveLength(2);
	});

	test('searches by name or email ignoring case and accents', () => {
		expect(
			filterPeople(people, 'ÁLVARES', 'all').map((item) => item.id),
		).toEqual(['b']);
		expect(filterPeople(people, 'ANA@', 'all').map((item) => item.id)).toEqual([
			'a',
		]);
		expect(filterPeople(people, 'zzz', 'all')).toHaveLength(0);
	});
});

test.describe('password link actions', () => {
	test('offers the initial send only when no link was sent', () => {
		expect(canSendInitialLink(person())).toBe(true);
		expect(canResendLink(person())).toBe(false);
	});

	test('allows resending while the account awaits the password', () => {
		for (const status of ['pendente', 'rejeitado', 'expirado'] as const) {
			expect(canResendLink(person({ latest_link: link(status) }))).toBe(true);
		}
	});

	test('blocks resending once the password is defined or the account is active', () => {
		const active = person({
			is_active: true,
			status: 'ativa',
			password_defined: true,
			latest_link: link('aceito'),
		});

		expect(canResendLink(active)).toBe(false);
		expect(canSendInitialLink(active)).toBe(false);
	});
});

test.describe('helpers', () => {
	test('flags translator roles as external', () => {
		expect(isExternalRoleName('Tradutor')).toBe(true);
		expect(isExternalRoleName('Recursos externos')).toBe(true);
		expect(isExternalRoleName('Financeiro')).toBe(false);
	});

	test('computes role changes', () => {
		expect(syncRoles(['a', 'b'], ['b', 'c'])).toEqual({
			toAdd: ['c'],
			toRemove: ['a'],
		});
	});

	test('builds initials from the name or the email', () => {
		expect(initials(person())).toBe('AS');
		expect(initials(person({ name: null, email: 'zeca@example.com' }))).toBe(
			'Z',
		);
	});
});
