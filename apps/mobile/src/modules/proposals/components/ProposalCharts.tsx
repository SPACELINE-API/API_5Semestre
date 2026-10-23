import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { EChart } from '../../../shared/components/charts/EChart';
import type { ChartOption } from '../../../shared/components/charts/types';
import type { Proposal, ProposalStatus } from '../types/proposal';
import { formatCompact } from '../../productivity/utils/format';
import {
	formatProposalValue,
	PROPOSAL_STATUS_COLORS,
	PROPOSAL_STATUS_LABELS,
} from '../utils/proposalFormat';
import { ChartCard } from '../../productivity/components/ChartCard';

const TEXT = { fontFamily: 'Inter', color: '#353535' };
const GRID = '#F0F0F0';
const STATUS_ORDER: ProposalStatus[] = ['pending', 'approved', 'reproved'];

function statusOption(proposals: Proposal[]): ChartOption {
	const counts = STATUS_ORDER.map(
		(status) => proposals.filter((proposal) => proposal.status === status).length,
	);
	return {
		textStyle: TEXT,
		tooltip: { trigger: 'item', confine: true },
		legend: { bottom: 0, icon: 'circle', textStyle: { ...TEXT, fontSize: 12 } },
		series: [{
			name: 'Propostas',
			type: 'pie',
			radius: ['48%', '72%'],
			center: ['50%', '44%'],
			label: { show: false },
			itemStyle: { borderColor: '#FFFFFF', borderWidth: 3 },
			data: STATUS_ORDER.map((status, index) => ({
				name: PROPOSAL_STATUS_LABELS[status],
				value: counts[index],
				itemStyle: { color: PROPOSAL_STATUS_COLORS[status] },
			})),
		}],
	};
}

function valuesOption(proposals: Proposal[]): ChartOption {
	const rows = [...proposals].sort((a, b) => Number(b.total_value) - Number(a.total_value));
	return {
		textStyle: TEXT,
		grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
		tooltip: {
			trigger: 'axis',
			axisPointer: { type: 'shadow' },
			confine: true,
			valueFormatter: (value: unknown) => formatProposalValue(Number(value) || 0),
		},
		xAxis: {
			type: 'value',
			axisLabel: {
				...TEXT,
				fontSize: 11,
				formatter: (value: number) => formatCompact(value),
			},
			splitLine: { lineStyle: { color: GRID } },
		},
		yAxis: {
			type: 'category',
			inverse: true,
			data: rows.map((proposal) => proposal.customer_name?.trim() || proposal.enterprise?.trim() || 'Cliente não informado'),
			axisLabel: { ...TEXT, fontSize: 11, width: 120, overflow: 'truncate' as const },
			axisLine: { show: false },
			axisTick: { show: false },
		},
		series: [{
			name: 'Valor total',
			type: 'bar',
			barMaxWidth: 22,
			data: rows.map((proposal) => Number(proposal.total_value) || 0),
			itemStyle: { color: '#1C6FB0', borderRadius: [0, 4, 4, 0] },
		}],
	};
}

type ProposalChartsProps = { proposals: Proposal[] };

export function ProposalCharts({ proposals }: ProposalChartsProps) {
	const status = useMemo(() => statusOption(proposals), [proposals]);
	const values = useMemo(() => valuesOption(proposals), [proposals]);
	const height = Math.max(160, Math.min(proposals.length, 8) * 40 + 56);

	return (
		<View className="gap-4 md:flex-row">
			<View className="md:flex-1">
				<ChartCard title="Propostas por status" subtitle="Dados da página atual">
					{proposals.length ? (
						<EChart option={status} height={240} accessibilityLabel="Gráfico de rosca com a distribuição das propostas da página atual por status" />
					) : <EmptyChart />}
				</ChartCard>
			</View>
			<View className="md:flex-[2]">
				<ChartCard title="Valor por proposta" subtitle="Dados da página atual">
					{proposals.length ? (
						<EChart option={values} height={height} accessibilityLabel="Gráfico de barras com o valor total de cada proposta da página atual" />
					) : <EmptyChart />}
				</ChartCard>
			</View>
		</View>
	);
}

function EmptyChart() {
	return <View className="items-center justify-center py-10"><Text className="text-center font-inter text-gray-400 text-xs">Nenhuma proposta nesta página.</Text></View>;
}
