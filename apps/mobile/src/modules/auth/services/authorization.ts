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
	return Boolean(permission && context?.permissions.includes(permission));
}

export function firstAllowedRoute(context: AuthorizationContext | null) {
	return (
		Object.entries(ROUTE_PERMISSIONS).find(([, permission]) =>
			context?.permissions.includes(permission),
		)?.[0] ?? '/login'
	);
}
