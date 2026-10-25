import {
	ActivityIndicator,
	Pressable,
	ScrollView,
	Text,
	View,
} from 'react-native';
import {
	BarChart3,
	CircleAlert,
	LayoutGrid,
	RefreshCw,
} from 'lucide-react-native';
import { AttentionBanner } from '../components/AttentionBanner';
import { DashboardCard } from '../components/DashboardCard';
import { PeriodFilter } from '../components/PeriodFilter';
import { SecondaryStats } from '../components/SecondaryStats';
import { StatusOverview } from '../components/StatusOverview';
import { useDashboard } from '../hooks/useDashboard';
import {
	formatRange,
	getPeriodRange,
	getSecondaryMetrics,
	needsAttention,
} from '../services/dashboardMetrics';

const OVERVIEW_SHORTCUT_IDS = ['requests', 'quotes', 'service-orders'];

export function DashboardPage() {
	const {
		shortcuts,
		metrics,
		roles,
		loading,
		error,
		reload,
		period,
		setPeriod,
		overview,
		overviewLoading,
		overviewError,
		reloadOverview,
	} = useDashboard();

	const roleLabel = roles.map((role) => role.name).join(' · ');
	const attention = metrics.filter(needsAttention);
	const secondary = getSecondaryMetrics(metrics);
	const canSeeOverview = shortcuts.some((s) =>
		OVERVIEW_SHORTCUT_IDS.includes(s.id),
	);
	const rangeLabel = formatRange(getPeriodRange(period));

	return (
		<ScrollView
			className="flex-1 bg-gray-50/50"
			showsVerticalScrollIndicator={false}
		>
			<View className="w-full max-w-6xl self-center gap-5 p-3 md:gap-8 md:p-8">
				{/* Cabeçalho */}
				<View className="flex-row items-start justify-between gap-3">
					<View className="min-w-0 flex-1">
						<View className="flex-row flex-wrap items-center gap-2.5">
							<Text className="font-poppins-bold text-xl text-gray-900 md:text-2xl">
								Painel
							</Text>
							{roleLabel.length > 0 && (
								<View className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5">
									<Text className="font-inter-medium text-[11px] text-blue-700 md:text-xs">
										{roleLabel}
									</Text>
								</View>
							)}
						</View>
						<Text className="mt-1 font-inter text-xs text-gray-500 md:text-sm">
							Acompanhe suas principais métricas e acesse rapidamente as ações
							do seu perfil.
						</Text>
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
					<View className="rounded-2xl border border-red-200 bg-red-50 p-6">
						<View className="flex-row items-start gap-3">
							<View className="mt-0.5 rounded-full bg-red-100 p-1">
								<CircleAlert size={18} color="#b91c1c" />
							</View>
							<View className="flex-1">
								<Text className="font-inter-semibold text-sm text-red-900">
									Não foi possível carregar o painel
								</Text>
								<Text className="mt-1 font-inter text-sm text-red-700">
									{error}
								</Text>
							</View>
						</View>
						<Pressable
							accessibilityRole="button"
							accessibilityLabel="Tentar novamente"
							onPress={() => void reload()}
							className="mt-4 flex-row items-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2.5 transition-colors hover:bg-red-50"
						>
							<RefreshCw size={16} color="#b91c1c" />
							<Text className="font-inter-medium text-sm text-red-800">
								Tentar novamente
							</Text>
						</Pressable>
					</View>
				) : (
					<>
						<AttentionBanner metrics={attention} />

						{/* Visão Geral */}
						{(canSeeOverview || secondary.length > 0) && (
							<View className="gap-3">
								<View className="gap-3 md:flex-row md:items-center md:justify-between">
									<View className="flex-row items-center gap-2">
										<BarChart3 size={16} color="#374151" />
										<Text className="font-inter-bold text-xs uppercase tracking-wider text-gray-700 md:text-sm">
											Visão Geral
										</Text>
									</View>
									{canSeeOverview && (
										<PeriodFilter value={period} onChange={setPeriod} />
									)}
								</View>

								{!canSeeOverview ? null : overviewError ? (
									<View className="rounded-2xl border border-red-200 bg-red-50 p-5">
										<View className="flex-row items-start gap-3">
											<CircleAlert size={18} color="#b91c1c" />
											<View className="flex-1">
												<Text className="font-inter-semibold text-sm text-red-900">
													Não foi possível carregar os dados do período
												</Text>
												<Text className="mt-1 font-inter text-sm text-red-700">
													{overviewError}
												</Text>
											</View>
										</View>
										<Pressable
											accessibilityRole="button"
											accessibilityLabel="Tentar novamente"
											onPress={() => void reloadOverview()}
											className="mt-4 flex-row items-center gap-2 self-start rounded-lg border border-red-300 bg-white px-4 py-2.5 transition-colors hover:bg-red-50"
										>
											<RefreshCw size={16} color="#b91c1c" />
											<Text className="font-inter-medium text-sm text-red-800">
												Tentar novamente
											</Text>
										</Pressable>
									</View>
								) : (
									<StatusOverview
										groups={overview?.groups ?? []}
										loading={overviewLoading}
										rangeLabel={rangeLabel}
									/>
								)}

								<SecondaryStats metrics={secondary} />
							</View>
						)}

						{/* Acesso Rápido */}
						{shortcuts.length > 0 ? (
							<View className="gap-3">
								<View className="flex-row items-center gap-2">
									<LayoutGrid size={16} color="#374151" />
									<Text className="font-inter-bold text-xs uppercase tracking-wider text-gray-700 md:text-sm">
										Acesso Rápido
									</Text>
								</View>
								<View className="flex-row flex-wrap gap-2 md:gap-3">
									{shortcuts.map((shortcut) => (
										<DashboardCard key={shortcut.id} shortcut={shortcut} />
									))}
								</View>
							</View>
						) : (
							<View className="items-center justify-center rounded-2xl border border-gray-200 bg-white p-12">
								<View className="mb-4 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
									<LayoutGrid size={24} color="#6b7280" />
								</View>
								<Text className="font-inter-semibold text-base text-gray-800">
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
