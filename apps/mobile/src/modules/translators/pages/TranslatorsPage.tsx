import { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	TextInput,
	useWindowDimensions,
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
import {
	TranslatorFilters,
	type StatusFilter,
} from '../components/TranslatorFilters';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { usePermission } from '../../auth/hooks/usePermission';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
export function TranslatorsPage() {
	const themeColors = useThemeColors();
	const { width } = useWindowDimensions();
	const router = useRouter();
	const { deleted } = useLocalSearchParams<{ deleted?: string }>();
	const { translators, isLoading, error, create } = useTranslators();

	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [isFormVisible, setIsFormVisible] = useState(false);
	const [showFilters, setShowFilters] = useState(false);
	const canWriteTranslators = usePermission('translators.write');

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
		<View className="relative flex-1 bg-surface">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="gap-6">
					{/* CABECALHO */}
					<View className="border-b border-border pb-6">
						<View className="flex-row flex-wrap items-start justify-between gap-4 md:items-center">
							<View className="flex-1">
								<Text className="font-inter font-bold text-foreground text-2xl">
									Tradutores
								</Text>
								<View className="mt-2 flex-row items-center gap-2">
									<Text className="font-inter text-foreground-muted text-sm">
										{translators.length}{' '}
										{translators.length === 1 ? 'tradutor' : 'tradutores'}
									</Text>
									<View className="h-1 w-1 rounded-full bg-border-strong" />
									<Text className="font-inter text-foreground-subtle text-sm">
										{activeCount} ativos
									</Text>
									{inactiveCount > 0 && (
										<>
											<View className="h-1 w-1 rounded-full bg-border-strong" />
											<Text className="font-inter text-foreground-subtle text-sm">
												{inactiveCount} inativos
											</Text>
										</>
									)}
								</View>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								disabled={!canWriteTranslators}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Novo tradutor"
								className={`shrink-0 flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 ${!canWriteTranslators ? 'opacity-40' : ''}`}
							>
								<Plus size={18} color={themeColors.primaryForeground} />
								<Text className="font-inter-medium text-sm text-primary-foreground">
									Novo tradutor
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{/* BARRA DE PESQUISA + FILTROS */}
					<View className="gap-3">
						<View className="flex-row items-center gap-2">
							<View className="h-10 flex-1 flex-row items-center rounded-lg border border-border bg-surface px-3">
								<Search size={17} color={themeColors.foregroundSubtle} />
								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder={
										width < 768
											? 'Buscar nome ou e-mail'
											: 'Buscar por nome, email...'
									}
									placeholderTextColor={themeColors.foregroundSubtle}
									className="ml-2 flex-1 border-0 font-inter text-foreground text-sm outline-none max-md:min-w-0 max-md:shrink h-10"
								/>
								{search.length > 0 && (
									<TouchableOpacity
										onPress={() => setSearch('')}
										activeOpacity={0.7}
									>
										<X size={15} color={themeColors.foregroundSubtle} />
									</TouchableOpacity>
								)}
							</View>

							<TouchableOpacity
								onPress={() => setShowFilters(!showFilters)}
								activeOpacity={0.7}
								className={`h-10 flex-row items-center justify-center gap-2 rounded-lg border px-2.5 ${
									showFilters || statusFilter !== 'all'
										? 'border-primary/40 bg-primary-soft'
										: 'border-border bg-surface'
								}`}
							>
								<SlidersHorizontal
									size={16}
									color={
										showFilters || statusFilter !== 'all'
											? themeColors.primaryText
											: themeColors.foregroundMuted
									}
								/>
								<Text
									className={`font-inter font-medium text-sm ${
										showFilters || statusFilter !== 'all'
											? 'text-primary-strong'
											: 'text-foreground-secondary'
									}`}
								>
									Filtros
								</Text>
								{statusFilter !== 'all' && (
									<View className="h-1.5 w-1.5 rounded-full bg-primary" />
								)}
							</TouchableOpacity>
						</View>

						<Text className="font-inter text-foreground-subtle text-xs">
							{filtered.length}{' '}
							{filtered.length === 1 ? 'resultado' : 'resultados'}
						</Text>
					</View>

					{/* ESTADOS DE CARREGAMENTO / ERRO / LISTA */}
					{isLoading && (
						<View className="items-center justify-center border-t border-border-subtle py-16">
							<ActivityIndicator color={themeColors.foregroundMuted} />
							<Text className="mt-3 font-inter text-foreground-subtle text-sm">
								Carregando tradutores...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-border-subtle py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color={themeColors.danger} />
								<Text className="font-inter font-semibold text-danger text-sm">
									Não foi possível carregar os tradutores
								</Text>
							</View>
							<Text className="mt-1 font-inter text-foreground-muted text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-border">
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
						className="absolute inset-0 z-10 bg-overlay/10"
					/>
					<View className="absolute bottom-0 right-0 top-0 z-20 w-[300px] gap-5 border-l border-border bg-surface p-5 shadow-xl">
						<View className="flex-row items-center justify-between">
							<Text className="font-inter font-bold text-foreground text-base">
								Filtros
							</Text>
							<TouchableOpacity
								onPress={() => setShowFilters(false)}
								activeOpacity={0.7}
							>
								<X size={18} color={themeColors.foregroundMuted} />
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
								<Text className="font-inter font-semibold text-primary-text text-sm">
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
