import type { AuthorizationContext } from './auth';

export const ROUTE_PERMISSIONS: Record<string, string> = {
	'/dashboard': 'dashboard.read',
	'/convites': 'assignments.read',
	'/meus-itens': 'assignments.read',
	'/meu-perfil': 'assignments.read',
	'/visualizar-requisicoes': 'requests.read',
	'/orcamento/novo-orcamento': 'quotes.write',
	'/orcamento/gerar': 'requests.read',
	'/orcamento': 'quotes.read',
	'/propostas': 'proposals.read',
	'/ordens-de-servico': 'service_orders.read',
	'/clientes': 'clients.read',
	'/tradutores': 'translators.read',
	'/produtividade': 'reports.productivity.read',
	'/support-agent': 'support.read',
	'/administracao': 'roles.read',
	'/usuarios': 'users.read',
	'/configuracoes/permissoes': 'roles.read',
	'/configuracoes/pessoas': 'users.read',
	'/configuracoes/sessao': 'settings.read',
	'/projetos': 'projects.read',
	'/tarefas/atribuidas': 'assignments.write',
};

const FULL_ROUTE_ACCESS_ROLES = new Set(['administrador', 'admin']);

function normalizeRoleName(roleName: string) {
	return roleName
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLocaleLowerCase('pt-BR');
}

export function isAdministratorRole(roleName: string) {
	return FULL_ROUTE_ACCESS_ROLES.has(normalizeRoleName(roleName));
}

export function hasFullRouteAccess(context: AuthorizationContext | null) {
	return Boolean(context?.roles.some((role) => isAdministratorRole(role.name)));
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

// MESMOS NOMES QUE O BACKEND TRATA COMO PERFIL EXTERNO (TRADUTOR)
const TRANSLATOR_ROLES = new Set([
	'recursos externos',
	'tradutor',
	'tradutora',
]);

export function isTranslatorProfile(context: AuthorizationContext | null) {
	return (
		!hasFullRouteAccess(context) &&
		Boolean(
			context?.roles.some((role) =>
				TRANSLATOR_ROLES.has(normalizeRoleName(role.name)),
			),
		)
	);
}

// TELAS DE QUALQUER FUNCIONARIO INTERNO, SEM PERMISSAO ESPECIFICA (TRADUTORES NAO ACESSAM)
const INTERNAL_USER_PATHS = ['/tarefas', '/tarefas/minhas'];

export function isInternalUserPath(pathname: string) {
	return INTERNAL_USER_PATHS.includes(pathname);
}

export function isInternalUser(context: AuthorizationContext | null) {
	return Boolean(context) && !isTranslatorProfile(context);
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

const PUBLIC_PATHS = [
	'/login',
	'/solicitar-servico',
	'/definir-senha',
	'/aprovar-orcamento',
];

export function isPublicPath(pathname: string) {
	return PUBLIC_PATHS.includes(pathname);
}

const ADMINISTRATOR_ONLY_PREFIXES = [
	'/configuracoes/pessoas',
	'/configuracoes/idiomas',
];

function isAdministratorOnlyPath(pathname: string) {
	return ADMINISTRATOR_ONLY_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}

export function canAccess(
	context: AuthorizationContext | null,
	pathname: string,
) {
	if (isPublicPath(pathname)) return true;
	if (isAdministratorOnlyPath(pathname)) return hasFullRouteAccess(context);
	if (isInternalUserPath(pathname)) return isInternalUser(context);
	if (
		pathname === '/configuracoes/sessao' ||
		pathname.startsWith('/configuracoes/sessao/')
	) {
		return (
			hasPermission(context, 'settings.read') ||
			hasPermission(context, 'settings.write')
		);
	}
	const permission = requiredPermission(pathname);
	return permission ? hasPermission(context, permission) : false;
}

export const LANDING_ROUTES = new Set([
	'/dashboard',
	'/convites',
	'/meus-itens',
	'/meu-perfil',
	'/visualizar-requisicoes',
	'/orcamento',
	'/propostas',
	'/ordens-de-servico',
	'/clientes',
	'/tradutores',
	'/produtividade',
	'/support-agent',
	'/configuracoes/permissoes',
	'/configuracoes/sessao',
]);

export function firstAllowedRoute(context: AuthorizationContext | null) {
	if (hasFullRouteAccess(context)) return '/dashboard';
	return (
		Object.entries(ROUTE_PERMISSIONS).find(
			([route]) => LANDING_ROUTES.has(route) && canAccess(context, route),
		)?.[0] ?? '/login'
	);
}
