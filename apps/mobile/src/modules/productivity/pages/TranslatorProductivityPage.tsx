import { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { EChart } from '../../../shared/components/charts/EChart';
import { ChartCard } from '../components/ChartCard';
import { DocumentsList } from '../components/DocumentsList';
import { KpiGrid } from '../components/KpiGrid';
import {
	ProductivityEmpty,
	ProductivityError,
	ProductivityLoading,
} from '../components/ProductivityStates';
import { useTranslatorProductivity } from '../hooks/useTranslatorProductivity';
import type { ProductivityFilters } from '../types/productivity';
import { groupDocumentsByDay, timelineOption } from '../utils/chartOptions';
import { formatIsoDate } from '../utils/format';

type TranslatorProductivityPageProps = {
	translatorId: string;
	filters: ProductivityFilters;
};

export function TranslatorProductivityPage({
	translatorId,
	filters,
}: TranslatorProductivityPageProps) {
	const router = useRouter();
	const { details, isLoading, error, refresh } = useTranslatorProductivity(
		translatorId,
		filters,
	);

	const timeline = useMemo(
		() =>
			details ? timelineOption(groupDocumentsByDay(details.documents)) : null,
		[details],
	);

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8"
			>
				<TouchableOpacity
					onPress={() => router.push('/produtividade' as never)}
					activeOpacity={0.7}
					className="mb-6 flex-row items-center gap-2 self-start"
				>
					<ArrowLeft size={16} color="#6B7280" />
					<Text className="font-inter text-gray-500 text-sm">
						Produtividade
					</Text>
				</TouchableOpacity>

				{isLoading && <ProductivityLoading />}

				{!isLoading && error && (
					<ProductivityError message={error} onRetry={() => void refresh()} />
				)}

				{!isLoading && !error && details && (
					<View className="gap-6">
						<View className="gap-1 border-b border-gray-200 pb-6">
							<Text className="font-inter font-bold text-gray-950 text-2xl">
								{details.translator_name}
							</Text>
							<Text className="font-inter text-gray-500 text-sm">
								{formatIsoDate(details.period_start)} a{' '}
								{formatIsoDate(details.period_end)}
							</Text>
						</View>

						{details.documents.length === 0 ? (
							<ProductivityEmpty
								title="Nenhum documento traduzido"
								description="Este profissional não concluiu documentos nos filtros selecionados."
							/>
						) : (
							<>
								<KpiGrid summary={details} />
								{timeline && (
									<ChartCard
										title="Entregas por dia"
										subtitle="Documentos concluídos e palavras traduzidas"
									>
										<EChart
											option={timeline}
											height={280}
											accessibilityLabel="Gráfico com documentos e palavras por dia"
										/>
									</ChartCard>
								)}
								<View className="gap-3">
									<Text className="font-inter font-bold text-gray-900 text-base">
										Documentos traduzidos
									</Text>
									<DocumentsList documents={details.documents} />
								</View>
							</>
						)}
					</View>
				)}
			</ScrollView>
		</View>
	);
}
