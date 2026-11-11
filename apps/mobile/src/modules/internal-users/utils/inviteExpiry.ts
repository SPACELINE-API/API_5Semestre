import type { InternalUser } from '../types/internalUser';
import { isAwaitingPassword } from './departments';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type ExpiryInfo = {
	expired: boolean;
	urgent: boolean;
	label: string;
	progress: number;
};

function plural(value: number, singular: string, pluralForm: string) {
	return `${value} ${value === 1 ? singular : pluralForm}`;
}

function formatDuration(ms: number) {
	if (ms >= DAY) {
		const days = Math.floor(ms / DAY);
		const hours = Math.floor((ms % DAY) / HOUR);
		return hours > 0
			? `${plural(days, 'dia', 'dias')} e ${hours}h`
			: plural(days, 'dia', 'dias');
	}
	if (ms >= HOUR) {
		const hours = Math.floor(ms / HOUR);
		const minutes = Math.floor((ms % HOUR) / MINUTE);
		return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
	}
	return `${Math.max(Math.ceil(ms / MINUTE), 1)} min`;
}

export function describeExpiry(
	sentAt: string,
	expiresAt: string,
	now: number,
): ExpiryInfo {
	const sent = new Date(sentAt).getTime();
	const expires = new Date(expiresAt).getTime();
	const remaining = expires - now;
	const total = Math.max(expires - sent, 1);

	if (remaining <= 0) {
		return {
			expired: true,
			urgent: true,
			label: `Expirou há ${formatDuration(-remaining)}`,
			progress: 1,
		};
	}

	return {
		expired: false,
		urgent: remaining < DAY,
		label: `Expira em ${formatDuration(remaining)}`,
		progress: Math.min(Math.max((now - sent) / total, 0), 1),
	};
}

export function pendingInvites(people: InternalUser[]) {
	return people
		.filter(
			(person) =>
				isAwaitingPassword(person) &&
				person.latest_link !== null &&
				(person.latest_link.status === 'pendente' ||
					person.latest_link.status === 'expirado'),
		)
		.sort(
			(a, b) =>
				new Date(a.latest_link!.expires_at).getTime() -
				new Date(b.latest_link!.expires_at).getTime(),
		);
}
