import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { EChart } from '../../../shared/components/charts/EChart';
import type { ChartMetric, ProductivityReport } from '../types/productivity';
import {
	METRIC_LABELS,
	punctualityByTranslatorOption,
	punctualityDonutOption,
	rankingOption,
} from '../utils/chartOptions';
import { ChartCard } from './ChartCard';

const METRICS: ChartMetric[] = ['documents', 'words', 'value'];
const ACTIVE_TOGGLE_STYLE = {
	backgroundColor: '#FFFFFF',
	shadowColor: '#000000',
	shadowOffset: { width: 0, height: 1 },
	shadowOpacity: 0.08,
	shadowRadius: 2,
	elevation: 1,
};
const ROW_HEIGHT = 40;
const CHART_PADDING = 56;

function barChartHeight(rowCount: number) {
	return Math.max(160, Math.min(rowCount, 8) * ROW_HEIGHT + CHART_PADDING);
}

type MetricToggleProps = {
	metric: ChartMetric;
	onChange: (metric: ChartMetric) => void;
};

function MetricToggle({ metric, onChange }: MetricToggleProps) {
	return (
		<View className="flex-row gap-1 rounded-lg bg-gray-50 p-1">
			{METRICS.map((item) => {
				const isActive = item === metric;

				return (
					<TouchableOpacity
						key={item}
						onPress={() => onChange(item)}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityState={{ selected: isActive }}
						className="rounded-md px-3 py-1.5"
						style={isActive ? ACTIVE_TOGGLE_STYLE : undefined}
					>
						<Text
							className={`font-inter text-xs ${isActive ? 'font-semibold text-blue-600' : 'text-gray-500'}`}
						>
							{METRIC_LABELS[item]}
						</Text>
					</TouchableOpacity>
				);
			})}
		</View>
	);
}

type ProductivityChartsProps = { report: ProductivityReport };

export function ProductivityCharts({ report }: ProductivityChartsProps) {
	const [metric, setMetric] = useState<ChartMetric>('documents');
	const { translators, summary } = report;

	const ranking = useMemo(
		() => rankingOption(translators, metric),
		[translators, metric],
	);
	const donut = useMemo(() => punctualityDonutOption(summary), [summary]);
	const stacked = useMemo(
		() => punctualityByTranslatorOption(translators),
		[translators],
	);
	const height = barChartHeight(translators.length);

	return (
		<View className="gap-4">
			<View className="gap-4 md:flex-row">
				<View className="md:flex-[2]">
					<ChartCard
						title="Volume por profissional"
						subtitle="Maiores volumes no período"
						action={<MetricToggle metric={metric} onChange={setMetric} />}
					>
						<EChart
							option={ranking}
							height={height}
							accessibilityLabel="Gráfico de barras com o volume por profissional"
						/>
					</ChartCard>
				</View>
				<View className="md:flex-1">
					<ChartCard
						title="Pontualidade"
						subtitle="Entregas no prazo e atrasadas"
					>
						{donut ? (
							<EChart
								option={donut}
								height={Math.max(height, 240)}
								accessibilityLabel="Gráfico de rosca com a pontualidade das entregas"
							/>
						) : (
							<View className="items-center justify-center py-10">
								<Text className="text-center font-inter text-gray-400 text-xs">
									Nenhum documento com prazo definido neste período.
								</Text>
							</View>
						)}
					</ChartCard>
				</View>
			</View>

			{translators.length > 1 && donut && (
				<ChartCard
					title="Pontualidade por profissional"
					subtitle="Documentos entregues no prazo e atrasados"
				>
					<EChart
						option={stacked}
						height={barChartHeight(translators.length) + 24}
						accessibilityLabel="Gráfico de barras empilhadas com a pontualidade por profissional"
					/>
				</ChartCard>
			)}
		</View>
	);
}
