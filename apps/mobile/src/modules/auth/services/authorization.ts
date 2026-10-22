import type { AuthorizationContext } from './auth';

export const ROUTE_PERMISSIONS: Record<string, string> = {
	'/dashboard': 'dashboard.read',
	'/convites': 'assignments.read',
	'/visualizar-requisicoes': 'requests.read',
	'/orcamento': 'quotes.read',
	'/ordens-de-servico': 'service_orders.read',
	'/clientes': 'clients.read',
	'/tradutores': 'translators.read',
	'/support-agent': 'support.read',
	'/administracao': 'roles.read',
	'/usuarios': 'users.read',
	'/configuracoes': 'settings.read',
	'/projetos': 'projects.read',
};

const ADMINISTRATOR_ROLES = new Set(['administrador', 'admin']);
const FULL_ROUTE_ACCESS_ROLES = new Set([...ADMINISTRATOR_ROLES, 'operador']);

function normalizeRoleName(roleName: string) {
	return roleName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLocaleLowerCase('pt-BR');
}

export function isAdministratorRole(roleName: string) {
	return ADMINISTRATOR_ROLES.has(normalizeRoleName(roleName));
}

export function isFullAccessRole(roleName: string) {
	return FULL_ROUTE_ACCESS_ROLES.has(normalizeRoleName(roleName));
}

export function hasFullRouteAccess(context: AuthorizationContext | null) {
	return Boolean(context?.roles.some((role) => isFullAccessRole(role.name)));
}

export function hasPermission(
	context: AuthorizationContext | null,
	permission: string,
) {
	return (
		hasFullRouteAccess(context) ||
		Boolean(context?.permissions.includes(permission))
	);
}

export function requiredPermission(pathname: string) {
	const route = Object.keys(ROUTE_PERMISSIONS)
		.sort((a, b) => b.length - a.length)
		.find(
			(candidate) =>
				pathname === candidate || pathname.startsWith(`${candidate}/`),
		);
	return route ? ROUTE_PERMISSIONS[route] : null;
}

export function canAccess(
	context: AuthorizationContext | null,
	pathname: string,
) {
	if (pathname === '/login' || pathname === '/solicitar-servico') return true;
	const permission = requiredPermission(pathname);
	return Boolean(
		permission &&
		(hasFullRouteAccess(context) || context?.permissions.includes(permission)),
	);
}

export function firstAllowedRoute(context: AuthorizationContext | null) {
	if (hasFullRouteAccess(context)) return '/dashboard';
	return (
		Object.entries(ROUTE_PERMISSIONS).find(([, permission]) =>
			context?.permissions.includes(permission),
		)?.[0] ?? '/login'
	);
}
