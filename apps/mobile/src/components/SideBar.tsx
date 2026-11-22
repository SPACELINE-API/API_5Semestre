import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
	clearSession,
	getAuthorizationContext,
	isTranslatorSession,
} from '../modules/auth/services/auth';
import {
	hasPermission,
	isTranslatorProfile,
} from '../modules/auth/services/authorization';
import type { LucideIcon } from 'lucide-react-native';
import {
	BarChart3 as ProdutividadeIcon,
	ClipboardList as TasksIcon,
	FileBarChart as ProposalsIcon,
	X as CloseIcon,
} from 'lucide-react-native';
import {
	DashboardIcon,
	RequisicoesIcon,
	OrcamentoIcon,
	OrdemServicoIcon,
	ClientesIcon,
	TradutoresIcon,
	PerfilIcon,
	SuporteIcon,
	ConfiguracoesIcon,
	SairIcon,
	AbrirIcon,
	FecharIcon,
} from '../shared/components/icon/icon';

import { useThemeColors } from '../shared/theme/ThemeProvider';
type NavItemProps = {
	icon: LucideIcon;
	label: string;
	isOpen: boolean;
	active: boolean;
	onPress: () => void;
	badge?: string | number;
	disabled?: boolean;
};

function NavItem({
	icon: Icon,
	label,
	isOpen,
	active,
	onPress,
	badge,
	disabled = false,
}: NavItemProps) {
	const themeColors = useThemeColors();
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled, selected: active }}
			className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl outline-none transition-colors ${
				active ? 'bg-primary-soft' : disabled ? '' : 'hover:bg-surface-subtle'
			} ${!isOpen ? 'justify-center px-0' : ''}`}
		>
			<Icon
				size={20}
				color={
					active
						? themeColors.primaryText
						: disabled
							? themeColors.foregroundSubtle
							: themeColors.foregroundSecondary
				}
				strokeWidth={1.8}
			/>
			{isOpen && (
				<Text
					className={`font-inter text-sm flex-1 ${
						active
							? 'font-semibold text-primary-text'
							: disabled
								? 'font-medium text-foreground-subtle'
								: 'font-medium text-foreground-secondary'
					}`}
				>
					{label}
				</Text>
			)}
			{isOpen && badge != null && (
				<View className="bg-surface-muted rounded-full px-2 py-0.5">
					<Text className="font-inter text-[12px] font-semibold text-foreground-secondary">
						{badge}
					</Text>
				</View>
			)}
		</TouchableOpacity>
	);
}

type GroupLabelProps = {
	isOpen: boolean;
	children: React.ReactNode;
};

function GroupLabel({ isOpen, children }: GroupLabelProps) {
	if (!isOpen) return null;
	return (
		<Text className="font-inter font-bold text-primary-text text-[12px] uppercase px-3 mb-2 tracking-wider">
			{children}
		</Text>
	);
}

type SideBarProps = {
	permissions: string[];
	mobileOpen?: boolean;
	onCloseMobile?: () => void;
};

export function SideBar({
	permissions,
	mobileOpen = false,
	onCloseMobile,
}: SideBarProps) {
	const themeColors = useThemeColors();
	const router = useRouter();
	const pathname = usePathname();
	const insets = useSafeAreaInsets();
	const [isOpen, setIsOpen] = useState<boolean>(true);

	const isDashboardActive = pathname === '/dashboard' || pathname === '/';
	const isProductivityActive = pathname.startsWith('/produtividade');
	const isRequestsActive = pathname.startsWith('/visualizar-requisicoes');
	const isClientsActive = pathname.startsWith('/clientes');
	const isOrdersActive = pathname.startsWith('/ordens-de-servico');
	const isSupportAgentActive = pathname.startsWith('/support-agent');
	const isTradutoresActive = pathname.startsWith('/tradutores');
	const isOrcamentoActive = pathname.startsWith('/orcamento');
	const isProposalsActive = pathname.startsWith('/propostas');
	const isMyItemsActive = pathname.startsWith('/meus-itens');
	const isProfileActive = pathname.startsWith('/meu-perfil');
	const isTasksActive = pathname.startsWith('/tarefas');
	const showExpanded = isOpen || mobileOpen;
	const authorizationContext = getAuthorizationContext();
	const isTranslator =
		isTranslatorSession() || isTranslatorProfile(authorizationContext);
	const displayName = authorizationContext?.user.email ?? 'Usuário';
	const displayRole =
		authorizationContext?.roles.map((role) => role.name).join(', ') ?? '';
	const displayInitials = displayName.slice(0, 2).toUpperCase();
	const can = (permission: string) =>
		hasPermission(
			authorizationContext ? { ...authorizationContext, permissions } : null,
			permission,
		);
	const canAccessTasks =
		can('tasks.read') &&
		(can('tasks.write') || can('tasks.assigned_to_me.read'));

	function navigate(path: string) {
		router.push(path as never);
		onCloseMobile?.();
	}

	return (
		<>
			{mobileOpen && (
				<TouchableOpacity
					activeOpacity={1}
					onPress={onCloseMobile}
					accessibilityRole="button"
					accessibilityLabel="Fechar menu"
					className="absolute inset-0 z-30 bg-overlay/30 md:hidden"
				/>
			)}

			<View
				style={mobileOpen ? { paddingTop: insets.top } : undefined}
				className={`h-full bg-surface border-r border-border-subtle z-40 flex-col py-6 shadow-sm ${
					mobileOpen ? 'absolute inset-y-0 left-0 flex' : 'hidden'
				} md:relative md:z-10 md:flex ${showExpanded ? 'w-72 px-4' : 'w-20 px-2'}`}
			>
				<View
					className={`items-center mb-6 pb-5 px-3 border-b border-border-subtle ${
						showExpanded ? 'flex-row justify-between' : 'flex-col gap-3 px-0'
					}`}
				>
					<View className="min-w-0 flex-1 flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 bg-primary items-center justify-center shrink-0">
							<Text className="font-inter font-bold text-primary-foreground text-sm">
								{displayInitials}
							</Text>
						</View>
						{showExpanded && (
							<View className="min-w-0 flex-1 flex-col">
								<Text
									className="font-inter font-bold text-foreground text-sm leading-tight"
									numberOfLines={1}
								>
									{displayName}
								</Text>
								<Text
									className="font-inter text-foreground-muted text-xs mt-0.5"
									numberOfLines={1}
								>
									{displayRole}
								</Text>
							</View>
						)}
					</View>
					<TouchableOpacity
						onPress={onCloseMobile ?? (() => setIsOpen(!isOpen))}
						className="items-center justify-center w-8 h-8 rounded-lg outline-none hover:bg-surface-subtle shrink-0 md:hidden"
					>
						<CloseIcon
							size={20}
							color={themeColors.foreground}
							strokeWidth={2.0}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setIsOpen(!isOpen)}
						className="hidden items-center justify-center w-8 h-8 rounded-lg outline-none hover:bg-surface-subtle shrink-0 md:flex"
					>
						{isOpen ? (
							<FecharIcon
								size={20}
								color={themeColors.foreground}
								strokeWidth={2.0}
							/>
						) : (
							<AbrirIcon
								size={20}
								color={themeColors.foreground}
								strokeWidth={2.0}
							/>
						)}
					</TouchableOpacity>
				</View>

				<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
					<View className="flex-col gap-6">
						{isTranslator ? (
							<View>
								<GroupLabel isOpen={showExpanded}>Meu trabalho</GroupLabel>
								<View className="flex-col gap-1">
									<NavItem
										icon={RequisicoesIcon}
										label="Convites"
										isOpen={showExpanded}
										active={pathname.startsWith('/convites')}
										disabled={!can('assignments.read')}
										onPress={() => navigate('/convites')}
									/>
									<NavItem
										icon={OrdemServicoIcon}
										label="Meus itens"
										isOpen={showExpanded}
										active={isMyItemsActive}
										disabled={!can('assignments.read')}
										onPress={() => navigate('/meus-itens')}
									/>
									<NavItem
										icon={PerfilIcon}
										label="Meu perfil"
										isOpen={showExpanded}
										active={isProfileActive}
										disabled={!can('assignments.read')}
										onPress={() => navigate('/meu-perfil')}
									/>
								</View>
							</View>
						) : (
							<>
								<View>
									<GroupLabel isOpen={showExpanded}>Principal</GroupLabel>
									<View className="flex-col gap-1">
										<NavItem
											icon={DashboardIcon}
											label="Dashboard"
											isOpen={showExpanded}
											active={isDashboardActive}
											disabled={!can('dashboard.read')}
											onPress={() => navigate('/dashboard')}
										/>
										<NavItem
											icon={ProdutividadeIcon}
											label="Produtividade"
											isOpen={showExpanded}
											active={isProductivityActive}
											disabled={!can('reports.productivity.read')}
											onPress={() => navigate('/produtividade')}
										/>
										<NavItem
											icon={TasksIcon}
											label="Tarefas"
											isOpen={showExpanded}
											active={isTasksActive}
											disabled={!canAccessTasks}
											onPress={() => navigate('/tarefas')}
										/>
									</View>
								</View>

								<View>
									<GroupLabel isOpen={showExpanded}>Serviços</GroupLabel>
									<View className="flex-col gap-1">
										<NavItem
											icon={RequisicoesIcon}
											label="Requisições"
											isOpen={showExpanded}
											active={isRequestsActive}
											disabled={!can('requests.read')}
											onPress={() => navigate('/visualizar-requisicoes')}
										/>
										<NavItem
											icon={OrcamentoIcon}
											label="Orçamento"
											isOpen={showExpanded}
											active={isOrcamentoActive}
											disabled={!can('quotes.read')}
											onPress={() => navigate('/orcamento')}
										/>
										<NavItem
											icon={ProposalsIcon}
											label="Propostas"
											isOpen={showExpanded}
											active={isProposalsActive}
											disabled={!can('proposals.read')}
											onPress={() => navigate('/propostas')}
										/>
										<NavItem
											icon={OrdemServicoIcon}
											label="Ordem de serviço"
											isOpen={showExpanded}
											active={isOrdersActive}
											disabled={!can('service_orders.read')}
											onPress={() => navigate('/ordens-de-servico')}
										/>
									</View>
								</View>

								<View>
									<GroupLabel isOpen={showExpanded}>Gerenciamento</GroupLabel>
									<View className="flex-col gap-1">
										<NavItem
											icon={ClientesIcon}
											label="Clientes"
											isOpen={showExpanded}
											active={isClientsActive}
											disabled={!can('clients.read')}
											onPress={() => navigate('/clientes')}
										/>
										<NavItem
											icon={TradutoresIcon}
											label="Tradutores"
											isOpen={showExpanded}
											active={isTradutoresActive}
											disabled={!can('translators.read')}
											onPress={() => navigate('/tradutores')}
										/>
									</View>
								</View>

								<View>
									<GroupLabel isOpen={showExpanded}>Outros</GroupLabel>
									<View className="flex-col gap-1">
										<NavItem
											icon={SuporteIcon}
											label="Suporte"
											isOpen={showExpanded}
											active={isSupportAgentActive}
											disabled={!can('support.read')}
											onPress={() => navigate('/support-agent')}
										/>
									</View>
								</View>
							</>
						)}
					</View>
				</ScrollView>

				<View className="relative flex-col gap-1 pt-4 mt-2 border-t border-border-subtle">
					{!isTranslator && (
						<NavItem
							icon={ConfiguracoesIcon}
							label="Configurações"
							isOpen={showExpanded}
							active={pathname.startsWith('/configuracoes')}
							disabled={
								!can('roles.read') &&
								!can('users.read') &&
								!can('languages.read') &&
								!can('settings.read') &&
								!can('settings.write')
							}
							onPress={() =>
								navigate(
									can('roles.read')
										? '/configuracoes/permissoes'
										: can('users.read')
											? '/configuracoes/pessoas'
											: can('languages.read')
												? '/configuracoes/idiomas'
												: '/configuracoes/sessao',
								)
							}
						/>
					)}
					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Sair do sistema"
						onPress={() => {
							clearSession();
							onCloseMobile?.();
							router.replace('/login' as never);
						}}
						className={`flex-row items-center gap-3 px-3 py-2.5 mt-1 rounded-xl outline-none hover:bg-danger-soft ${
							!showExpanded ? 'justify-center px-0' : ''
						}`}
					>
						<SairIcon size={20} color={themeColors.danger} strokeWidth={1.8} />
						{showExpanded && (
							<Text className="font-inter font-medium text-danger text-sm">
								Sair do sistema
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</>
	);
}
