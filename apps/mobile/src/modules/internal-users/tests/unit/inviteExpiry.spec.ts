import { test, expect } from '@playwright/test';
import type { InternalUser } from '../../types/internalUser';
import { describeExpiry, pendingInvites } from '../../utils/inviteExpiry';

const SENT = '2026-11-07T10:00:00Z';
const EXPIRES = '2026-11-10T10:00:00Z';
const at = (iso: string) => new Date(iso).getTime();

function person(
	id: string,
	status: 'pendente' | 'aceito' | 'rejeitado' | 'expirado' | null,
	expires = EXPIRES,
	overrides: Partial<InternalUser> = {},
): InternalUser {
	return {
		id,
		name: id,
		email: `${id}@example.com`,
		phone: null,
		is_active: false,
		status: 'inativa',
		password_defined: false,
		roles: [],
		permissions: [],
		latest_link: status
			? { status, sent_at: SENT, expires_at: expires, used_at: null }
			: null,
		created_at: SENT,
		updated_at: SENT,
		...overrides,
	};
}

test.describe('describeExpiry', () => {
	test('shows days and hours while the link is valid', () => {
		const info = describeExpiry(SENT, EXPIRES, at('2026-11-07T10:00:00Z'));

		expect(info.label).toBe('Expira em 3 dias');
		expect(info.expired).toBe(false);
		expect(info.urgent).toBe(false);
		expect(info.progress).toBe(0);
		expect(
			describeExpiry(SENT, EXPIRES, at('2026-11-08T06:00:00Z')).label,
		).toBe('Expira em 2 dias e 4h');
	});

	test('marks the last day as urgent and counts hours and minutes', () => {
		const info = describeExpiry(SENT, EXPIRES, at('2026-11-10T07:30:00Z'));

		expect(info.label).toBe('Expira em 2h 30min');
		expect(info.urgent).toBe(true);
		expect(info.progress).toBeGreaterThan(0.95);
	});

	test('shows minutes when less than an hour is left', () => {
		expect(
			describeExpiry(SENT, EXPIRES, at('2026-11-10T09:15:00Z')).label,
		).toBe('Expira em 45 min');
	});

	test('reports how long ago the link expired', () => {
		const info = describeExpiry(SENT, EXPIRES, at('2026-11-11T13:00:00Z'));

		expect(info.expired).toBe(true);
		expect(info.label).toBe('Expirou há 1 dia e 3h');
		expect(info.progress).toBe(1);
	});
});

test.describe('pendingInvites', () => {
	test('keeps only accounts awaiting the password, soonest expiry first', () => {
		const people = [
			person('later', 'pendente', '2026-11-10T10:00:00Z'),
			person('sooner', 'pendente', '2026-11-09T10:00:00Z'),
			person('old', 'expirado', '2026-11-08T10:00:00Z'),
			person('never-sent', null),
			person('done', 'aceito', EXPIRES, {
				is_active: true,
				status: 'ativa',
				password_defined: true,
			}),
			person('replaced', 'rejeitado'),
		];

		expect(pendingInvites(people).map((item) => item.id)).toEqual([
			'old',
			'sooner',
			'later',
		]);
	});
});
