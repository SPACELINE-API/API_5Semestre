import { useEffect } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
	FlatList,
} from 'react-native';
import { AlertCircle, ChevronRight, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { getSession } from '../../auth/services/auth';
import { useMyInvites } from '../hooks/useMyInvites';
import { InviteStatusBadge } from '../components/InviteStatusBadge';
import { formatDate } from '../utils/format';

export function MyInvitesPage() {
	const router = useRouter();
	const { invites, isLoading, error } = useMyInvites();

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
							{invites.length} {invites.length === 1 ? 'convite' : 'convites'}
						</Text>
					</View>

					{isLoading && (
						<View className="items-center justify-center border-t border-gray-100 py-16">
							<ActivityIndicator color="#6B7280" />

							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando convites...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
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
						<View className="border-t border-gray-200">
							<FlatList
								data={invites}
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
										<View className="flex-1 gap-1">
											<Text className="font-inter font-semibold text-gray-900 text-sm">
												Convite recebido em {formatDate(invite.sent_at)}
											</Text>

											<InviteStatusBadge status={invite.status} />
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
											Nenhum convite recebido
										</Text>

										<Text className="mt-1 font-inter text-gray-400 text-xs">
											Convites de tradução aparecerão aqui.
										</Text>
									</View>
								}
							/>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
