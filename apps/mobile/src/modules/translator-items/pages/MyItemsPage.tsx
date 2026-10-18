import {
	ActivityIndicator,
	ScrollView,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, ChevronRight, ClipboardList } from 'lucide-react-native';
import { formatDate } from '../../invites/utils/format';
import {
	WORKFLOW_CURRENT_BAND_CLASS,
	WORKFLOW_STEPS,
} from '../../service-orders/utils/workflowSteps';
import type { ServiceOrderItemStatus } from '../../service-orders/types/serviceOrder';
import { useMyItems } from '../hooks/useMyItems';

function stageOf(status: string) {
	const index = WORKFLOW_STEPS.findIndex((step) => step.status === status);
	if (index === -1) return null;
	return { index, step: WORKFLOW_STEPS[index] };
}

export function MyItemsPage() {
	const router = useRouter();
	const { items, isLoading, error, refresh } = useMyItems();

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-6 border-b border-gray-200 pb-6">
					<Text className="font-inter font-bold text-gray-950 text-2xl">
						Meus itens
					</Text>
					<Text className="mt-2 font-inter text-gray-500 text-sm">
						{items.length} {items.length === 1 ? 'item' : 'itens'} para tradução
					</Text>
				</View>

				{isLoading && (
					<View className="items-center justify-center py-16">
						<ActivityIndicator color="#6B7280" />
						<Text className="mt-3 font-inter text-gray-400 text-sm">
							Carregando itens...
						</Text>
					</View>
				)}

				{!isLoading && error && (
					<View className="gap-3 py-8">
						<View className="flex-row items-center gap-2">
							<AlertCircle size={16} color="#DC2626" />
							<Text className="font-inter font-semibold text-red-600 text-sm">
								{error}
							</Text>
						</View>
						<TouchableOpacity
							onPress={() => void refresh()}
							className="self-start rounded-lg border border-gray-300 px-4 py-2"
						>
							<Text className="font-inter text-gray-700 text-sm">
								Tentar novamente
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{!isLoading && !error && items.length === 0 && (
					<View className="items-center justify-center py-16">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<ClipboardList size={18} color="#9CA3AF" />
						</View>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhum item atribuído a você
						</Text>
						<Text className="mt-1 text-center font-inter text-gray-400 text-xs">
							Ao aceitar um convite, o item aparece aqui para você traduzir e
							enviar.
						</Text>
					</View>
				)}

				{!isLoading && !error && items.length > 0 && (
					<View className="gap-3">
						{items.map((item) => {
							const stage = stageOf(item.status);

							return (
								<TouchableOpacity
									key={item.id}
									onPress={() =>
										router.push({
											pathname: '/meus-itens/[id]',
											params: { id: item.id },
										})
									}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityLabel={`Abrir item ${item.source_language} para ${item.target_language}`}
									className="flex-row items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
								>
									<View className="flex-1 gap-1.5">
										<Text className="font-inter font-semibold text-gray-900 text-sm">
											{item.source_language} → {item.target_language}
											{item.document_type ? ` · ${item.document_type}` : ''}
										</Text>
										<Text className="font-inter text-gray-500 text-xs">
											Prazo {formatDate(item.deadline)} ·{' '}
											{item.delivered_files.length}{' '}
											{item.delivered_files.length === 1
												? 'arquivo enviado'
												: 'arquivos enviados'}
										</Text>
										{stage && (
											<View className="flex-row items-center gap-2">
												<View
													className={`h-2 w-2 rounded-full ${WORKFLOW_CURRENT_BAND_CLASS[item.status as ServiceOrderItemStatus]}`}
												/>
												<Text className="font-inter font-medium text-gray-700 text-xs">
													Etapa {stage.index + 1} de {WORKFLOW_STEPS.length} ·{' '}
													{stage.step.title}
												</Text>
											</View>
										)}
									</View>
									<ChevronRight size={17} color="#9CA3AF" />
								</TouchableOpacity>
							);
						})}
					</View>
				)}
			</ScrollView>
		</View>
	);
}
