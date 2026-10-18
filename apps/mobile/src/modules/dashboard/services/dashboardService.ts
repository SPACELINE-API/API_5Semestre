import { apiGetAuth } from '../../../shared/services/apiClient';
import { request } from '../../../shared/services/publicApiClient';
import {
	getSession,
	setAuthorizationContext,
	type AuthorizationContext,
} from '../../auth/services/auth';
import { hasFullRouteAccess } from '../../auth/services/authorization';
import { listCompanies } from '../../clients/services/companyService';
import { listMyInvites } from '../../invites/services/inviteService';
import { fetchRequests } from '../../requests/services/requests';
import { listServiceOrders } from '../../service-orders/services/serviceOrderService';
import type {
	DashboardData,
	DashboardMetric,
	DashboardShortcut,
} from '../types/shortcut';

export const AVAILABLE_SHORTCUTS: DashboardShortcut[] = [
	{
		id: 'assignments',
		title: 'Tarefas atribuídas',
		description:
			'Visualize e gerencie os convites e tarefas de tradução atribuídas a você.',
		route: '/convites',
		permission: 'assignments.read',
		category: 'Serviços',
	},
	{
		id: 'requests',
		title: 'Requisições',
		description:
			'Consulte e acompanhe as solicitações e pedidos de serviço enviados.',
		route: '/visualizar-requisicoes',
		permission: 'requests.read',
		category: 'Serviços',
	},
	{
		id: 'quotes',
		title: 'Orçamento',
		description:
			'Consulte, elabore e acompanhe propostas comerciais e orçamentos.',
		route: '/orcamento',
		permission: 'quotes.read',
		category: 'Serviços',
	},
	{
		id: 'service-orders',
		title: 'Ordem de serviço',
		description:
			'Acompanhe o andamento de ordens ativas, envie documentos e conclua pedidos.',
		route: '/ordens-de-servico',
		permission: 'service_orders.read',
		category: 'Serviços',
	},
	{
		id: 'clients',
		title: 'Clientes',
		description:
			'Acesse o cadastro, contatos e informações detalhadas de clientes.',
		route: '/clientes',
		permission: 'clients.read',
		category: 'Gerenciamento',
	},
	{
		id: 'translators',
		title: 'Tradutores',
		description:
			'Consulte e gerencie a lista de tradutores parceiros e pares de idiomas.',
		route: '/tradutores',
		permission: 'translators.read',
		category: 'Gerenciamento',
	},
	{
		id: 'support',
		title: 'Suporte',
		description:
			'Abra chamados e tire dúvidas com o assistente virtual de atendimento.',
		route: '/support-agent',
		permission: 'support.read',
		category: 'Outros',
	},
];

export function getAuthorizedShortcuts(
	context: AuthorizationContext | null,
): DashboardShortcut[] {
	if (!context) return [];
	if (hasFullRouteAccess(context)) {
		return AVAILABLE_SHORTCUTS;
	}
	const permissions = Array.isArray(context.permissions)
		? context.permissions
		: [];
	return AVAILABLE_SHORTCUTS.filter((shortcut) =>
		permissions.includes(shortcut.permission),
	);
}

export async function fetchDashboardMetrics(
	context: AuthorizationContext,
): Promise<DashboardMetric[]> {
	const permissions = Array.isArray(context.permissions)
		? context.permissions
		: [];
	const isFull = hasFullRouteAccess(context);
	const roleNames = context.roles.map((r) => r.name.toLowerCase());
	const isExternalResource = roleNames.some((r) =>
		r.includes('recursos externos'),
	);

	const metrics: DashboardMetric[] = [];
	const fetchTasks: Promise<void>[] = [];

	// 1. Convites e Tarefas (Tradutores / Recursos externos, e também visível para quem tem assignments.read)
	if (
		isExternalResource ||
		permissions.includes('assignments.read') ||
		permissions.includes('assignments.respond')
	) {
		fetchTasks.push(
			listMyInvites()
				.then((invites) => {
					const pending = invites.filter((i) => i.status === 'pendente').length;
					const accepted = invites.filter(
						(i) => i.status === 'aceito' && i.item_status !== 'concluida',
					).length;

					metrics.push({
						id: 'my-invites-pending',
						title: 'Convites Pendentes',
						value: pending,
						description:
							pending === 1
								? '1 convite aguardando sua resposta'
								: `${pending} convites aguardando resposta`,
						badge: pending > 0 ? 'Ação necessária' : 'Em dia',
						badgeType: pending > 0 ? 'warning' : 'success',
						route: '/convites',
						icon: 'invites',
					});

					metrics.push({
						id: 'my-tasks-accepted',
						title: 'Tarefas Aceitas',
						value: accepted,
						description:
							accepted === 1
								? '1 tarefa de tradução em andamento'
								: `${accepted} tarefas em andamento`,
						badge: 'Ativas',
						badgeType: 'info',
						route: '/convites',
						icon: 'check',
					});
				})
				.catch((err) => {
					console.warn('Dashboard: Erro ao carregar convites:', err);
				}),
		);
	}

	// 2. Requisições (Atendimento, Projetos, Admin)
	if (isFull || permissions.includes('requests.read')) {
		fetchTasks.push(
			fetchRequests()
				.then((requests) => {
					const pending = requests.filter((r) => r.status === 'pending').length;
					metrics.push({
						id: 'requests-pending',
						title: 'Requisições Pendentes',
						value: pending,
						description:
							pending === 1
								? '1 solicitação aguardando triagem'
								: `${pending} solicitações aguardando triagem`,
						badge: pending > 0 ? 'Novas' : 'Em dia',
						badgeType: pending > 0 ? 'warning' : 'success',
						route: '/visualizar-requisicoes',
						icon: 'requests',
					});
				})
				.catch((err) => {
					console.warn('Dashboard: Erro ao carregar requisições:', err);
				}),
		);
	}

	// 3. Orçamentos (Projetos, Financeiro, Admin)
	if (isFull || permissions.includes('quotes.read')) {
		fetchTasks.push(
			apiGetAuth<{ total: number }>('/api/quotes?status=pending')
				.then((res) => {
					metrics.push({
						id: 'quotes-pending',
						title: 'Orçamentos em Aberto',
						value: res.total,
						description:
							res.total === 1
								? '1 orçamento aguardando aprovação'
								: `${res.total} orçamentos aguardando aprovação`,
						badge: res.total > 0 ? 'Em aberto' : 'Em dia',
						badgeType: res.total > 0 ? 'warning' : 'success',
						route: '/orcamento',
						icon: 'quotes',
					});
				})
				.catch((err) => {
					console.warn(
						'Dashboard: Erro ao carregar orçamentos pendentes:',
						err,
					);
				}),
		);

		fetchTasks.push(
			apiGetAuth<{ total: number }>('/api/quotes?status=approved')
				.then((res) => {
					metrics.push({
						id: 'quotes-approved',
						title: 'Orçamentos Aprovados',
						value: res.total,
						description: `${res.total} propostas comerciais aprovadas`,
						badge: 'Aprovados',
						badgeType: 'info',
						route: '/orcamento',
						icon: 'quotes',
					});
				})
				.catch((err) => {
					console.warn(
						'Dashboard: Erro ao carregar orçamentos aprovados:',
						err,
					);
				}),
		);
	}

	// 4. Ordens de Serviço (Projetos, Financeiro, Admin)
	if (isFull || permissions.includes('service_orders.read')) {
		fetchTasks.push(
			listServiceOrders()
				.then((orders) => {
					const active = orders.filter((o) => o.status !== 'concluida').length;
					metrics.push({
						id: 'orders-active',
						title: 'Ordens de Serviço Ativas',
						value: active,
						description:
							active === 1
								? '1 ordem de serviço em andamento'
								: `${active} ordens em andamento`,
						badge: 'Em execução',
						badgeType: 'info',
						route: '/ordens-de-servico',
						icon: 'service-orders',
					});
				})
				.catch((err) => {
					console.warn('Dashboard: Erro ao carregar ordens de serviço:', err);
				}),
		);
	}

	// 5. Clientes (Atendimento, Admin)
	if (isFull || permissions.includes('clients.read')) {
		fetchTasks.push(
			listCompanies()
				.then((companies) => {
					metrics.push({
						id: 'clients-count',
						title: 'Clientes Cadastrados',
						value: companies.length,
						description: `${companies.length} empresas na base de dados`,
						badge: 'Base ativa',
						badgeType: 'neutral',
						route: '/clientes',
						icon: 'clients',
					});
				})
				.catch((err) => {
					console.warn('Dashboard: Erro ao carregar clientes:', err);
				}),
		);
	}

	// 6. Tradutores (Projetos, Admin)
	if (isFull || permissions.includes('translators.read')) {
		fetchTasks.push(
			apiGetAuth<unknown[]>('/api/translators')
				.then((translators) => {
					metrics.push({
						id: 'translators-count',
						title: 'Tradutores Parceiros',
						value: translators.length,
						description: `${translators.length} profissionais parceiros`,
						badge: 'Disponíveis',
						badgeType: 'neutral',
						route: '/tradutores',
						icon: 'translators',
					});
				})
				.catch((err) => {
					console.warn('Dashboard: Erro ao carregar tradutores:', err);
				}),
		);
	}

	await Promise.allSettled(fetchTasks);

	// Garantir ordem consistente de exibição
	const metricOrder = [
		'my-invites-pending',
		'my-tasks-accepted',
		'requests-pending',
		'quotes-pending',
		'quotes-approved',
		'orders-active',
		'clients-count',
		'translators-count',
	];

	return metrics.sort((a, b) => {
		const indexA = metricOrder.indexOf(a.id);
		const indexB = metricOrder.indexOf(b.id);
		return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
	});
}

export async function fetchDashboardData(): Promise<DashboardData> {
	const session = getSession();
	if (!session) {
		throw new Error('Sessão ausente.');
	}
	const context = await request<AuthorizationContext>('/api/auth/me', {
		headers: { Authorization: `Bearer ${session.access_token}` },
	});
	setAuthorizationContext(context);

	const metrics = await fetchDashboardMetrics(context);

	return {
		shortcuts: getAuthorizedShortcuts(context),
		metrics,
		user: context.user,
		roles: context.roles,
	};
}
