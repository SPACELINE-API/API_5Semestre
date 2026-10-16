import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProductivityCharts } from '../components/ProductivityCharts';
import { ProductivityFilters } from '../components/ProductivityFilters';
import {
	ProductivityEmpty,
	ProductivityError,
	ProductivityLoading,
} from '../components/ProductivityStates';
import { KpiGrid } from '../components/KpiGrid';
import { TranslatorsTable } from '../components/TranslatorsTable';
import { useProductivityFilterOptions } from '../hooks/useProductivityFilterOptions';
import { useProductivityReport } from '../hooks/useProductivityReport';
import type { ProductivityFilters as Filters } from '../types/productivity';
import { defaultFilters } from '../utils/filters';
import { formatIsoDate } from '../utils/format';

export function ProductivityPage() {
	const router = useRouter();
	const [filters, setFilters] = useState<Filters>(() => defaultFilters());
	const { options } = useProductivityFilterOptions();
	const { report, isLoading, error, refresh } = useProductivityReport(filters);

	function openTranslator(translatorId: string) {
		router.push({
			pathname: '/produtividade/[id]',
			params: {
				id: translatorId,
				from: filters.dateFrom,
				to: filters.dateTo,
				project: filters.serviceOrderId,
			},
		} as never);
	}

	const hasData = Boolean(report && report.summary.documents_translated > 0);

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8"
			>
				<View className="mb-6 border-b border-gray-200 pb-6">
					<Text className="font-inter font-bold text-gray-950 text-2xl">
						Produtividade
					</Text>
					<Text className="mt-2 font-inter text-gray-500 text-sm">
						{report
							? `Documentos traduzidos de ${formatIsoDate(report.period_start)} a ${formatIsoDate(report.period_end)}`
							: 'Acompanhe o volume de documentos traduzidos por profissional.'}
					</Text>
				</View>

				<View className="gap-6">
					<ProductivityFilters
						filters={filters}
						options={options}
						onChange={setFilters}
					/>

					{isLoading && <ProductivityLoading />}

					{!isLoading && error && (
						<ProductivityError message={error} onRetry={() => void refresh()} />
					)}

					{!isLoading && !error && report && !hasData && (
						<ProductivityEmpty
							title="Nenhum documento traduzido"
							description="Não há documentos concluídos para os filtros selecionados. Tente ampliar o período."
						/>
					)}

					{!isLoading && !error && report && hasData && (
						<>
							<KpiGrid summary={report.summary} />
							<ProductivityCharts report={report} />
							<View className="gap-3">
								<Text className="font-inter font-bold text-gray-900 text-base">
									Profissionais
								</Text>
								<TranslatorsTable
									rows={report.translators}
									onSelect={openTranslator}
								/>
							</View>
						</>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
