import { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
} from 'react-native';
import {
	Plus,
	Search,
	SlidersHorizontal,
	AlertCircle,
	X,
} from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslators } from '../hooks/useTranslators';
import { TranslatorTable } from '../components/TranslatorTable';
import { TranslatorFormModal } from '../components/TranslatorFormModal';
import { TranslatorFilters, type StatusFilter } from '../components/TranslatorFilters';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { useIsDesktop } from '../../../shared/hooks/useIsDesktop';

export function TranslatorsPage() {
	const router = useRouter();
	const { deleted } = useLocalSearchParams<{ deleted?: string }>();
	const isDesktop = useIsDesktop();

	const { translators, isLoading, error, create } = useTranslators();

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [showFilters, setShowFilters] = useState(false);

	const { toast, showToast } = useToast();

	useEffect(() => {
		if (deleted === '1') {
			showToast('Tradutor excluído com sucesso!', 'success');
			router.setParams({ deleted: undefined });
		}
	}, [deleted]);

	const filtered = useMemo(() => {
		const q = search.toLowerCase().trim();
		return translators
			.filter((t) => {
				const matchSearch =
					!q ||
					t.name.toLowerCase().includes(q) ||
					t.email.toLowerCase().includes(q) ||
					t.phone.includes(q);
				const matchStatus =
					statusFilter === 'all' ||
					(statusFilter === 'active' ? t.is_active : !t.is_active);
				return matchSearch && matchStatus;
			})
			.sort((a, b) => Number(b.is_active) - Number(a.is_active));
	}, [translators, search, statusFilter]);

	const activeCount = translators.filter((t) => t.is_active).length;
	const inactiveCount = translators.length - activeCount;

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="gap-6">
					{/* CABECALHO */}
					<View className="border-b border-gray-200 pb-6">
						<View className="flex-row items-start justify-between gap-4 md:items-center">
							<View className="flex-1">
								<Text className="font-inter font-bold text-gray-950 text-2xl">
									Tradutores
								</Text>
								<View className="mt-2 flex-row items-center gap-2">
									<Text className="font-inter text-gray-500 text-sm">
										{translators.length}{' '}
										{translators.length === 1 ? 'tradutor' : 'tradutores'}
									</Text>
									<View className="h-1 w-1 rounded-full bg-gray-300" />
									<Text className="font-inter text-gray-400 text-sm">
										{activeCount} ativos
									</Text>
									{inactiveCount > 0 && (
										<>
											<View className="h-1 w-1 rounded-full bg-gray-300" />
											<Text className="font-inter text-gray-400 text-sm">
												{inactiveCount} inativos
											</Text>
										</>
									)}
								</View>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Novo tradutor"
								className={
									isDesktop
										? 'h-10 flex-row items-center justify-center gap-2 self-start rounded-lg bg-blue-300 px-4'
										: 'h-11 w-11 items-center justify-center self-start rounded-full bg-blue-300'
								}
							>
								<Plus size={isDesktop ? 16 : 20} color="#042C53" />
								{isDesktop && (
									<Text className="font-inter font-semibold text-blue-900 text-sm">
										Novo tradutor
									</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>

					{/* BARRA DE PESQUISA + FILTROS */}
					<View className="gap-3">
						<View className="flex-row items-center gap-3">
							<View className="h-10 flex-1 flex-row items-center rounded-lg border border-gray-200 bg-white px-3">
								<Search size={17} color="#9CA3AF" />
								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder="Buscar por nome, email..."
									placeholderTextColor="#9CA3AF"
									className="ml-2 flex-1 border-0 font-inter text-gray-800 text-sm outline-none"
								/>
								{search.length > 0 && (
									<TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
										<X size={15} color="#9CA3AF" />
									</TouchableOpacity>
								)}
							</View>

							<TouchableOpacity
								onPress={() => setShowFilters(!showFilters)}
								activeOpacity={0.7}
								className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-3 ${
									showFilters || statusFilter !== 'all'
										? 'border-blue-300 bg-blue-50'
										: 'border-gray-200 bg-white'
								}`}
							>
								<SlidersHorizontal
									size={16}
									color={showFilters || statusFilter !== 'all' ? '#1C6FB0' : '#6B7280'}
								/>
								<Text
									className={`font-inter font-medium text-sm ${
										showFilters || statusFilter !== 'all'
											? 'text-blue-900'
											: 'text-gray-600'
									}`}
								>
									Filtros
								</Text>
								{statusFilter !== 'all' && (
									<View className="h-1.5 w-1.5 rounded-full bg-blue-600" />
								)}
							</TouchableOpacity>
						</View>

						<Text className="font-inter text-gray-400 text-xs">
							{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
						</Text>
					</View>

					{/* ESTADOS DE CARREGAMENTO / ERRO / LISTA */}
					{isLoading && (
						<View className="items-center justify-center border-t border-gray-100 py-16">
							<ActivityIndicator color="#6B7280" />
							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando tradutores...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />
								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar os tradutores
								</Text>
							</View>
							<Text className="mt-1 font-inter text-gray-500 text-sm">{error}</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-gray-200">
							<TranslatorTable
								translators={filtered}
								onSelectTranslator={(t) =>
									router.push({
										pathname: '/tradutores/[id]',
										params: { id: t.id },
									})
								}
							/>
						</View>
					)}
				</View>
			</ScrollView>

			{/* MODAL DE CADASTRO */}
			<TranslatorFormModal
				visible={isFormVisible}
				onClose={() => setIsFormVisible(false)}
				onSubmit={async (data) => {
					try {
						await create(data);
						setIsFormVisible(false);
						showToast('Tradutor cadastrado com sucesso!', 'success');
					} catch (err) {
						showToast(
							err instanceof Error
								? err.message
								: 'Não foi possível cadastrar o tradutor.',
							'error',
						);
						throw err;
					}
				}}
				toast={toast}
			/>

			<Toast toast={isFormVisible ? null : toast} />

			{/* PAINEL DE FILTROS LATERAL */}
			{showFilters && (
				<>
					<TouchableOpacity
						activeOpacity={1}
						onPress={() => setShowFilters(false)}
						className="absolute inset-0 z-10 bg-black/10"
					/>
					<View className="absolute bottom-0 right-0 top-0 z-20 w-[300px] gap-5 border-l border-gray-200 bg-white p-5 shadow-xl">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-gray-900 text-base">
								Filtros
							</Text>
							<TouchableOpacity onPress={() => setShowFilters(false)} activeOpacity={0.7}>
								<X size={18} color="#8A8A8A" />
							</TouchableOpacity>
						</View>

						<TranslatorFilters
							statusFilter={statusFilter}
							onStatusFilterChange={setStatusFilter}
						/>

						{statusFilter !== 'all' && (
							<TouchableOpacity
								onPress={() => setStatusFilter('all')}
								activeOpacity={0.7}
								className="self-start"
							>
								<Text className="font-inter font-semibold text-blue-600 text-sm">
									Limpar filtros
								</Text>
							</TouchableOpacity>
						)}
					</View>
				</>
			)}
		</View>
	);
}
