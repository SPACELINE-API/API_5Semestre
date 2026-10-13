import { useEffect, useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	FlatList,
} from 'react-native';
import { AlertCircle, ChevronRight, Mail, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getSession } from '../../auth/services/auth';
import { useMyInvites } from '../hooks/useMyInvites';
import { InviteStatusBadge } from '../components/InviteStatusBadge';
import {
	InviteSearchBar,
	InviteStatusFilterPanel,
	type InviteStatusFilter,
} from '../components/InviteFilters';
import { formatDate } from '../utils/format';
import { WORKFLOW_STEPS } from '../../service-orders/utils/workflowSteps';

function stageLabel(status: string) {
	const index = WORKFLOW_STEPS.findIndex((step) => step.status === status);
	if (index === -1) return '';
	return `Etapa ${index + 1} de ${WORKFLOW_STEPS.length} · ${WORKFLOW_STEPS[index].title}`;
}

function normalize(value: string) {
	return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function MyInvitesPage() {
	const router = useRouter();
	const { invites, isLoading, error } = useMyInvites();
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<InviteStatusFilter>('all');
	const [showFilters, setShowFilters] = useState(false);

	const filteredInvites = useMemo(() => {
		const query = normalize(search.trim());

		return invites.filter((invite) => {
			if (statusFilter !== 'all' && invite.status !== statusFilter)
				return false;
			if (!query) return true;

			return normalize(
				`${invite.item.document_type ?? ''} ${invite.item.source_language} ${invite.item.target_language}`,
			).includes(query);
		});
	}, [invites, search, statusFilter]);

	useEffect(() => {
		if (!getSession()) {
			router.replace('/login');
		}
	}, [router]);

	if (!getSession()) return null;

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="
					px-5
					py-6
					md:px-10
					md:py-8
					md:max-w-[1200px]
					md:w-full
					md:self-center
				"
			>
				<View className="gap-6">
					<View className="border-b border-gray-200 pb-6">
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Meus Convites
						</Text>

						<Text className="mt-2 font-inter text-gray-500 text-sm">
							{filteredInvites.length}{' '}
							{filteredInvites.length === 1 ? 'convite' : 'convites'}
						</Text>
					</View>

					{isLoading && (
						<View className="items-center justify-center py-16">
							<ActivityIndicator color="#6B7280" />

							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando convites...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />

								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar os convites
								</Text>
							</View>

							<Text className="mt-1 font-inter text-gray-500 text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View>
							<InviteSearchBar
								search={search}
								onSearchChange={setSearch}
								statusFilter={statusFilter}
								showFilters={showFilters}
								onToggleFilters={() => setShowFilters((current) => !current)}
							/>
							<FlatList
								data={filteredInvites}
								keyExtractor={(invite) => invite.id}
								scrollEnabled={false}
								renderItem={({ item: invite }) => (
									<TouchableOpacity
										onPress={() =>
											router.push({
												pathname: '/convites/[id]',
												params: { id: invite.id },
											})
										}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel={`Ver convite ${invite.id}`}
										className="flex-row items-center justify-between border-b border-gray-100 px-1 py-4"
									>
										<View className="flex-1 gap-1.5">
											<Text className="font-inter font-semibold text-gray-900 text-sm">
												{invite.item.source_language} →{' '}
												{invite.item.target_language}
												{invite.item.document_type
													? ` · ${invite.item.document_type}`
													: ''}
											</Text>

											<Text className="font-inter text-gray-500 text-xs">
												Recebido em {formatDate(invite.sent_at)} · Prazo{' '}
												{formatDate(invite.item.deadline)}
											</Text>

											<View className="flex-row flex-wrap items-center gap-2">
												<InviteStatusBadge status={invite.status} />
												{invite.status === 'aceito' && (
													<Text className="font-inter text-gray-500 text-xs">
														{stageLabel(invite.item.status)}
													</Text>
												)}
											</View>
										</View>

										<ChevronRight size={17} color="#9CA3AF" />
									</TouchableOpacity>
								)}
								ListEmptyComponent={
									<View className="items-center justify-center py-16">
										<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
											<Mail size={18} color="#9CA3AF" />
										</View>

										<Text className="font-inter font-medium text-gray-800 text-sm">
											{invites.length === 0
												? 'Nenhum convite recebido'
												: 'Nenhum convite encontrado'}
										</Text>

										<Text className="mt-1 font-inter text-gray-400 text-xs">
											{invites.length === 0
												? 'Convites de tradução aparecerão aqui.'
												: 'Tente alterar a busca ou o filtro de status.'}
										</Text>
									</View>
								}
							/>
						</View>
					)}
				</View>
			</ScrollView>

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

							<TouchableOpacity
								onPress={() => setShowFilters(false)}
								activeOpacity={0.7}
							>
								<X size={18} color="#8A8A8A" />
							</TouchableOpacity>
						</View>

						<InviteStatusFilterPanel
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
