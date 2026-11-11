import type {
	Department,
	InternalUser,
	LinkStatus,
	StatusFilter,
} from '../types/internalUser';

const EXTERNAL_ROLE_NAMES = new Set([
	'tradutor',
	'tradutora',
	'recursos externos',
]);

export function normalizeText(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLocaleLowerCase('pt-BR');
}

export function isExternalRoleName(name: string) {
	return EXTERNAL_ROLE_NAMES.has(normalizeText(name));
}

export const LINK_STATUS_LABELS: Record<LinkStatus, string> = {
	pendente: 'Pendente',
	aceito: 'Aceito',
	rejeitado: 'Rejeitado',
	expirado: 'Expirado',
};

export function displayName(person: InternalUser) {
	return person.name?.trim() || person.email;
}

export function initials(person: InternalUser) {
	const parts = displayName(person).split(/\s+/).filter(Boolean);
	const first = parts[0]?.[0] ?? '?';
	const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
	return `${first}${last}`.toUpperCase();
}

export function isAwaitingPassword(person: InternalUser) {
	return !person.is_active && !person.password_defined;
}

export function canSendInitialLink(person: InternalUser) {
	return isAwaitingPassword(person) && person.latest_link === null;
}

export function canResendLink(person: InternalUser) {
	return isAwaitingPassword(person) && person.latest_link !== null;
}

export function filterPeople(
	people: InternalUser[],
	search: string,
	status: StatusFilter,
) {
	const term = normalizeText(search);
	return people.filter((person) => {
		if (status !== 'all' && person.status !== status) return false;
		if (!term) return true;
		return (
			normalizeText(displayName(person)).includes(term) ||
			normalizeText(person.email).includes(term)
		);
	});
}

export function groupByDepartment(people: InternalUser[]): Department[] {
	const groups = new Map<string, Department>();
	for (const person of people) {
		for (const role of person.roles) {
			const group = groups.get(role.id) ?? {
				key: role.id,
				name: role.name,
				people: [],
			};
			group.people.push(person);
			groups.set(role.id, group);
		}
	}
	const collator = new Intl.Collator('pt-BR');
	return [...groups.values()]
		.map((group) => ({
			...group,
			people: [...group.people].sort((a, b) =>
				collator.compare(displayName(a), displayName(b)),
			),
		}))
		.sort((a, b) => collator.compare(a.name, b.name));
}

export function syncRoles(current: string[], selected: string[]) {
	return {
		toAdd: selected.filter((id) => !current.includes(id)),
		toRemove: current.filter((id) => !selected.includes(id)),
	};
}
