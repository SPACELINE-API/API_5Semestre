import { Text, View } from 'react-native';
import type { ProductivityIndicators } from '../types/productivity';
import {
	formatCurrencyValue,
	formatDays,
	formatInteger,
	formatPercent,
} from '../utils/format';

type Kpi = { key: string; label: string; value: string; hint?: string };

export function buildKpis(summary: ProductivityIndicators): Kpi[] {
	return [
		{
			key: 'documents',
			label: 'Documentos traduzidos',
			value: formatInteger(summary.documents_translated),
		},
		{
			key: 'words',
			label: 'Palavras',
			value: formatInteger(summary.total_words),
		},
		{
			key: 'value',
			label: 'Valor produzido',
			value: formatCurrencyValue(summary.total_value),
		},
		{
			key: 'punctuality',
			label: 'Entregas no prazo',
			value: formatPercent(summary.on_time_rate),
			hint: `${summary.on_time_documents} no prazo · ${summary.late_documents} atrasadas`,
		},
		{
			key: 'turnaround',
			label: 'Prazo médio',
			value: formatDays(summary.average_turnaround_days),
			hint: 'da criação à conclusão',
		},
		{
			key: 'projects',
			label: 'Projetos',
			value: formatInteger(summary.projects_count),
		},
	];
}

type KpiGridProps = { summary: ProductivityIndicators };

export function KpiGrid({ summary }: KpiGridProps) {
	return (
		<View className="flex-row flex-wrap gap-3">
			{buildKpis(summary).map((kpi) => (
				<View
					key={kpi.key}
					className="min-w-[44%] flex-1 gap-1 rounded-xl border border-gray-100 bg-white p-4 md:min-w-[30%] xl:min-w-[15%]"
				>
					<Text className="font-inter text-gray-500 text-xs" numberOfLines={1}>
						{kpi.label}
					</Text>
					<Text
						className="font-inter font-bold text-gray-950 text-xl"
						numberOfLines={1}
					>
						{kpi.value}
					</Text>
					{kpi.hint && (
						<Text
							className="font-inter text-gray-400 text-xs"
							numberOfLines={1}
						>
							{kpi.hint}
						</Text>
					)}
				</View>
			))}
		</View>
	);
}
