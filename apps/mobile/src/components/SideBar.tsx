import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, usePathname, Link } from 'expo-router';
import { clearSession } from '../modules/auth/services/auth';
import type { LucideIcon } from 'lucide-react-native';
import { X as CloseIcon } from 'lucide-react-native';
import {
	RequisicoesIcon,
	OrcamentoIcon,
	OrdemServicoIcon,
	ClientesIcon,
	TradutoresIcon,
	SuporteIcon,
	ConfiguracoesIcon,
	SairIcon,
	AbrirIcon,
	FecharIcon,
	ChevronRight,
	AdminIcon,
	PermissoesIcon,
	IntegracoesIcon,
} from '../shared/components/icon/icon';

type NavItemProps = {
	icon: LucideIcon;
	label: string;
	isOpen: boolean;
	active: boolean;
	onPress: () => void;
	badge?: string | number;
};

function NavItem({
	icon: Icon,
	label,
	isOpen,
	active,
	onPress,
	badge,
}: NavItemProps) {
	return (
		<TouchableOpacity
			onPress={onPress}
			className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl outline-none transition-colors ${
				active ? 'bg-blue-50' : 'hover:bg-gray-50'
			} ${!isOpen ? 'justify-center px-0' : ''}`}
		>
			<Icon
				size={20}
				color={active ? '#2563eb' : '#4b5563'}
				strokeWidth={1.8}
			/>
			{isOpen && (
				<Text
					className={`font-inter text-sm flex-1 ${
						active ? 'font-semibold text-blue-600' : 'font-medium text-gray-700'
					}`}
				>
					{label}
				</Text>
			)}
			{isOpen && badge != null && (
				<View className="bg-gray-100 rounded-full px-2 py-0.5">
					<Text className="font-inter text-[11px] font-semibold text-gray-600">
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
		<Text className="font-inter font-bold text-blue-600 text-[11px] uppercase px-3 mb-2 tracking-wider">
			{children}
		</Text>
	);
}

type SideBarProps = {
	mobileOpen?: boolean;
	onCloseMobile?: () => void;
};

export function SideBar({ mobileOpen = false, onCloseMobile }: SideBarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const insets = useSafeAreaInsets();
	const [isOpen, setIsOpen] = useState<boolean>(true);
	const [activeItem, setActiveItem] = useState<string>('Requisições');
	const [adminExpanded, setAdminExpanded] = useState<boolean>(false);

	const isRequestsActive = pathname.startsWith('/visualizar-requisicoes');
	const isClientsActive = pathname.startsWith('/clientes');
	const isOrdersActive = pathname.startsWith('/ordens-de-servico');
	const isSupportAgentActive = pathname.startsWith('/support-agent');
	const isKnownRoute =
		isClientsActive || isOrdersActive || isSupportAgentActive;
	const isOrcamentoActive = pathname.startsWith('/orcamento');
	const showExpanded = isOpen || mobileOpen;

	function navigate(path: string, item: string) {
		setActiveItem(item);
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
					className="absolute inset-0 z-30 bg-black/30 md:hidden"
				/>
			)}

			<View
				style={mobileOpen ? { paddingTop: insets.top } : undefined}
				className={`h-full bg-white border-r border-gray-100 z-40 flex-col py-6 shadow-sm ${
					mobileOpen ? 'absolute inset-y-0 left-0 flex' : 'hidden'
				} md:relative md:z-10 md:flex ${showExpanded ? 'w-72 px-4' : 'w-20 px-2'}`}
			>
				<View
					className={`items-center mb-6 pb-5 px-3 border-b border-gray-100 ${
						showExpanded ? 'flex-row justify-between' : 'flex-col gap-3 px-0'
					}`}
				>
					<View className="flex-row items-center gap-3">
						<View className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 bg-blue-500 items-center justify-center shrink-0">
							<Text className="font-inter font-bold text-white text-sm">
								MD
							</Text>
						</View>
						{showExpanded && (
							<View className="flex-col">
								<Text className="font-inter font-bold text-gray-900 text-sm leading-tight">
									Marina Duarte
								</Text>
								<Text className="font-inter text-gray-500 text-xs mt-0.5">
									Atendente
								</Text>
							</View>
						)}
					</View>
					<TouchableOpacity
						onPress={onCloseMobile ?? (() => setIsOpen(!isOpen))}
						className="items-center justify-center w-8 h-8 rounded-lg outline-none hover:bg-gray-50 shrink-0 md:hidden"
					>
						<CloseIcon size={20} color="#1f2937" strokeWidth={2.0} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => setIsOpen(!isOpen)}
						className="hidden items-center justify-center w-8 h-8 rounded-lg outline-none hover:bg-gray-50 shrink-0 md:flex"
					>
						{isOpen ? (
							<FecharIcon size={20} color="#1f2937" strokeWidth={2.0} />
						) : (
							<AbrirIcon size={20} color="#1f2937" strokeWidth={2.0} />
						)}
					</TouchableOpacity>
				</View>

				<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
					<View className="flex-col gap-6">
						<View>
							<GroupLabel isOpen={showExpanded}>Serviços</GroupLabel>
							<View className="flex-col gap-1">
								<NavItem
									icon={RequisicoesIcon}
									label="Requisições"
									isOpen={showExpanded}
									active={isRequestsActive}
									onPress={() =>
										navigate('/visualizar-requisicoes', 'Requisições')
									}
								/>
								<Link href={'/orcamento' as never} asChild>
									<TouchableOpacity
										className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl outline-none transition-colors ${
											isOrcamentoActive ? 'bg-blue-50' : 'hover:bg-gray-50'
										} ${!showExpanded ? 'justify-center px-0' : ''}`}
									>
										<OrcamentoIcon
											size={20}
											color={isOrcamentoActive ? '#2563eb' : '#4b5563'}
											strokeWidth={1.8}
										/>
										{showExpanded && (
											<Text
												className={`font-inter text-sm flex-1 ${
													isOrcamentoActive
														? 'font-semibold text-blue-600'
														: 'font-medium text-gray-700'
												}`}
											>
												Orçamento
											</Text>
										)}
									</TouchableOpacity>
								</Link>
								<NavItem
									icon={OrdemServicoIcon}
									label="Ordem de serviço"
									isOpen={showExpanded}
									active={isOrdersActive}
									onPress={() =>
										navigate('/ordens-de-servico', 'Ordem de serviço')
									}
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
									onPress={() => navigate('/clientes', 'Clientes')}
								/>
								<NavItem
									icon={TradutoresIcon}
									label="Tradutores"
									isOpen={showExpanded}
									active={!isKnownRoute && activeItem === 'Tradutores'}
									onPress={() => {
										setActiveItem('Tradutores');
										onCloseMobile?.();
									}}
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
									onPress={() => navigate('/support-agent', 'Suporte')}
								/>
							</View>
						</View>
					</View>
				</ScrollView>

				<View className="relative flex-col gap-1 pt-4 mt-2 border-t border-gray-100">
					<View className="relative">
						{showExpanded && adminExpanded && (
							<View className="absolute left-full ml-2 w-48 bg-white border border-gray-100 rounded-xl p-1.5 shadow-lg z-50">
								<TouchableOpacity className="flex-row items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
									<ClientesIcon size={16} color="#6b7280" strokeWidth={1.8} />
									<Text className="font-inter text-[13px] text-gray-600">
										Usuários da plataforma
									</Text>
								</TouchableOpacity>

								<TouchableOpacity className="flex-row items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
									<PermissoesIcon size={16} color="#6b7280" strokeWidth={1.8} />
									<Text className="font-inter text-[13px] text-gray-600">
										Perfis de acesso
									</Text>
								</TouchableOpacity>

								<TouchableOpacity className="flex-row items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50">
									<IntegracoesIcon
										size={16}
										color="#6b7280"
										strokeWidth={1.8}
									/>
									<Text className="font-inter text-[13px] text-gray-600">
										Integrações
									</Text>
								</TouchableOpacity>
							</View>
						)}

						<TouchableOpacity
							onPress={() => {
								if (!showExpanded) {
									setIsOpen(true);
									setAdminExpanded(true);
									return;
								}
								setAdminExpanded((prev) => !prev);
							}}
							className={`flex-row items-center gap-3 px-3 py-2.5 rounded-xl outline-none ${
								adminExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
							} ${!showExpanded ? 'justify-center px-0' : ''}`}
						>
							<AdminIcon size={20} color="#4b5563" strokeWidth={1.8} />
							{showExpanded && (
								<>
									<Text className="font-inter font-medium text-gray-700 text-sm flex-1">
										Administração
									</Text>
									<ChevronRight size={16} color="#9ca3af" strokeWidth={2} />
								</>
							)}
						</TouchableOpacity>
					</View>

					<NavItem
						icon={ConfiguracoesIcon}
						label="Configurações"
						isOpen={showExpanded}
						active={!isKnownRoute && activeItem === 'Configurações'}
						onPress={() => {
							setActiveItem('Configurações');
							onCloseMobile?.();
						}}
					/>

					<TouchableOpacity
						accessibilityRole="button"
						accessibilityLabel="Sair do sistema"
						onPress={() => {
							clearSession();
							onCloseMobile?.();
							router.replace('/login' as never);
						}}
						className={`flex-row items-center gap-3 px-3 py-2.5 mt-1 rounded-xl outline-none hover:bg-red-50 ${
							!showExpanded ? 'justify-center px-0' : ''
						}`}
					>
						<SairIcon size={20} color="#dc2626" strokeWidth={1.8} />
						{showExpanded && (
							<Text className="font-inter font-medium text-red-600 text-sm">
								Sair do sistema
							</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</>
	);
}
