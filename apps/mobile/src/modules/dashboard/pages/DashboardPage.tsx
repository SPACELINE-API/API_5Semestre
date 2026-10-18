import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	BarChart3,
	CircleAlert,
	LayoutGrid,
	RefreshCw,
	Sparkles,
} from 'lucide-react-native';
import { DashboardCard } from '../components/DashboardCard';
import { DashboardStatCard } from '../components/DashboardStatCard';
import { useDashboard } from '../hooks/useDashboard';

export function DashboardPage() {
	const { shortcuts, metrics, user, roles, loading, error, reload } =
		useDashboard();

	const roleLabel = roles.map((role) => role.name).join(' · ');
	const userDisplayName = user?.email ? user.email.split('@')[0] : 'Usuário';

	return (
		<ScrollView
			className="flex-1 bg-gray-50/50"
			showsVerticalScrollIndicator={false}
		>
			<View className="w-full max-w-6xl self-center p-3 md:p-8">
				{/* Top Header Card */}
				<View className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xs md:rounded-3xl md:p-8">
					<View className="flex-row flex-wrap items-center justify-between gap-3 md:gap-4">
						<View className="flex-1 min-w-[200px]">
							<View className="flex-row items-center gap-1.5 md:gap-2">
								<Sparkles size={16} color="#2563eb" />
								<Text className="font-inter-semibold text-[10px] md:text-xs text-blue-600 uppercase tracking-wider">
									Painel Espacial
								</Text>
							</View>
							<Text className="mt-1 font-poppins-bold text-xl text-gray-900 md:text-3xl">
								Olá, {userDisplayName}!
							</Text>
							<Text className="mt-0.5 font-inter text-xs text-gray-500 md:text-sm">
								Acompanhe suas principais métricas e acesse rapidamente as ações
								do seu perfil.
							</Text>
						</View>

						<View className="flex-row items-center gap-2">
							{roleLabel.length > 0 && (
								<View className="rounded-lg md:rounded-xl border border-blue-100 bg-blue-50/80 px-2.5 py-1 md:px-4 md:py-2">
									<Text className="font-inter-semibold text-[11px] md:text-xs text-blue-700">
										{roleLabel}
									</Text>
								</View>
							)}

							<TouchableOpacity
								accessibilityRole="button"
								accessibilityLabel="Atualizar painel"
								onPress={() => void reload()}
								activeOpacity={0.7}
								className="h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg md:rounded-xl border border-gray-200 bg-white shadow-xs hover:bg-gray-50"
							>
								<RefreshCw size={14} color="#4b5563" />
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{loading ? (
					<View className="mt-16 items-center justify-center gap-3">
						<ActivityIndicator size="large" color="#2563eb" />
						<Text className="font-inter text-sm text-gray-500">
							Carregando informações do painel...
						</Text>
					</View>
				) : error ? (
					<View className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
						<View className="flex-row items-start gap-3">
							<View className="mt-0.5 rounded-full bg-red-100 p-1">
								<CircleAlert size={18} color="#b91c1c" />
							</View>
							<View className="flex-1">
								<Text className="font-inter font-semibold text-sm text-red-900">
									Não foi possível carregar o painel
								</Text>
								<Text className="mt-1 font-inter text-sm text-red-700">
									{error}
								</Text>
							</View>
						</View>
						<TouchableOpacity
							accessibilityRole="button"
							accessibilityLabel="Tentar novamente"
							onPress={() => void reload()}
							className="mt-4 flex-row items-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2.5 shadow-sm hover:bg-red-50"
						>
							<RefreshCw size={16} color="#b91c1c" />
							<Text className="font-inter-medium text-sm text-red-800">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				) : (
					<>
						{/* Seção de Visão Geral (Métricas em tempo real) */}
						{metrics.length > 0 && (
							<View className="mt-6 md:mt-8">
								<View className="mb-3 flex-row items-center gap-2">
									<BarChart3 size={16} color="#374151" />
									<Text className="font-inter-bold text-xs md:text-sm uppercase text-gray-700 tracking-wider">
										Visão Geral
									</Text>
								</View>
								<View className="w-full flex-row flex-wrap gap-2.5 md:gap-4">
									{metrics.map((metric) => (
										<DashboardStatCard key={metric.id} metric={metric} />
									))}
								</View>
							</View>
						)}

						{/* Seção de Acessos Rápidos */}
						{shortcuts.length > 0 ? (
							<View className="mt-6 md:mt-8">
								<View className="mb-3 flex-row items-center justify-between">
									<View className="flex-row items-center gap-2">
										<LayoutGrid size={16} color="#374151" />
										<Text className="font-inter-bold text-xs md:text-sm uppercase text-gray-700 tracking-wider">
											Acessos Rápidos
										</Text>
									</View>
									<Text className="font-inter-medium text-[11px] md:text-xs text-gray-400">
										{shortcuts.length} módulos disponíveis
									</Text>
								</View>
								<View className="w-full flex-row flex-wrap gap-2.5 md:gap-4">
									{shortcuts.map((shortcut) => (
										<DashboardCard key={shortcut.id} shortcut={shortcut} />
									))}
								</View>
							</View>
						) : (
							<View className="mt-8 items-center justify-center rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
								<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
									<LayoutGrid size={24} color="#6b7280" />
								</View>
								<Text className="font-inter font-semibold text-base text-gray-800">
									Nenhuma ação disponível
								</Text>
								<Text className="mt-1 max-w-md text-center font-inter text-sm text-gray-500">
									Seu perfil não possui permissões ativas para acessar os
									módulos do sistema.
								</Text>
							</View>
						)}
					</>
				)}
			</View>
		</ScrollView>
	);
}
