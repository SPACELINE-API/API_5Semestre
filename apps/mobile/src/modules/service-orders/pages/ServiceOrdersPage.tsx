import { useMemo, useState } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import { Plus, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useServiceOrders } from '../hooks/useServiceOrders';
import { useCompanies } from '../../clients/hooks/useCompanies';
import { useContacts } from '../hooks/useContacts';
import { ServiceOrderTable } from '../components/ServiceOrderTable';
import { GenerateOrderModal } from '../components/GenerateOrderModal';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';

export function ServiceOrdersPage() {
	const router = useRouter();

	const { serviceOrders, isLoading, error, create } = useServiceOrders();
	const { companies } = useCompanies();
	const { contacts } = useContacts();

	const [isFormVisible, setIsFormVisible] = useState(false);
	const { toast, showToast } = useToast();

	const companiesById = useMemo(
		() => new Map(companies.map((company) => [company.id, company])),
		[companies],
	);

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
						<View className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<View>
								<Text className="font-inter font-bold text-gray-950 text-2xl">
									Ordens de Serviço
								</Text>

								<Text className="mt-2 font-inter text-gray-500 text-sm">
									{serviceOrders.length}{' '}
									{serviceOrders.length === 1 ? 'ordem' : 'ordens'}
								</Text>
							</View>

							<TouchableOpacity
								onPress={() => setIsFormVisible(true)}
								activeOpacity={0.8}
								accessibilityRole="button"
								accessibilityLabel="Gerar ordem de serviço a partir de um orçamento"
								className="h-10 flex-row items-center justify-center gap-2 self-start rounded-lg bg-blue-300 px-4"
							>
								<Plus size={16} color="#042C53" />

								<Text className="font-inter font-semibold text-blue-900 text-sm">
									Gerar ordem de serviço
								</Text>
							</TouchableOpacity>
						</View>
					</View>

					{isLoading && (
						<View className="items-center justify-center border-t border-gray-100 py-16">
							<ActivityIndicator color="#6B7280" />

							<Text className="mt-3 font-inter text-gray-400 text-sm">
								Carregando ordens de serviço...
							</Text>
						</View>
					)}

					{!isLoading && error && (
						<View className="border-t border-gray-100 py-8">
							<View className="flex-row items-center gap-2">
								<AlertCircle size={16} color="#DC2626" />

								<Text className="font-inter font-semibold text-red-600 text-sm">
									Não foi possível carregar as ordens de serviço
								</Text>
							</View>

							<Text className="mt-1 font-inter text-gray-500 text-sm">
								{error}
							</Text>
						</View>
					)}

					{!isLoading && !error && (
						<View className="border-t border-gray-200">
							<ServiceOrderTable
								serviceOrders={serviceOrders}
								companiesById={companiesById}
								onSelectServiceOrder={(serviceOrder) =>
									router.push({
										pathname: '/ordens-de-servico/[id]',
										params: { id: serviceOrder.id },
									})
								}
							/>
						</View>
					)}
				</View>
			</ScrollView>

			<GenerateOrderModal
				visible={isFormVisible}
				companies={companies}
				contacts={contacts}
				onClose={() => setIsFormVisible(false)}
				onSubmit={async (data) => {
					try {
						await create(data);
						setIsFormVisible(false);
						showToast('Ordem de serviço gerada com sucesso!', 'success');
					} catch (submitError) {
						showToast(
							submitError instanceof Error
								? submitError.message
								: 'Não foi possível gerar a ordem de serviço.',
							'error',
						);
						throw submitError;
					}
				}}
				toast={toast}
			/>

			<Toast toast={isFormVisible ? null : toast} />
		</View>
	);
}
