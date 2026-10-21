import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { formatCurrency } from '../services/dashboardMetrics';
import type { OverviewGroup } from '../types/overview';

const COLORS = [
	'#2563eb',
	'#f59e0b',
	'#10b981',
	'#8b5cf6',
	'#ef4444',
	'#0891b2',
	'#6b7280',
];

type ChartMetric = 'count' | 'amount';

type StatusOverviewProps = {
	groups: OverviewGroup[];
	loading: boolean;
	rangeLabel: string;
};

function groupTotals(group: OverviewGroup) {
	return group.statuses.reduce(
		(acc, s) => ({
			count: acc.count + s.count,
			amount: acc.amount + (s.amount ?? 0),
		}),
		{ count: 0, amount: 0 },
	);
}

function Card({ children }: { children: React.ReactNode }) {
	return (
		<View className="rounded-2xl border border-gray-100 bg-white p-4 md:p-6">
			{children}
		</View>
	);
}

export function StatusOverview({
	groups,
	loading,
	rangeLabel,
}: StatusOverviewProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [chartMetric, setChartMetric] = useState<ChartMetric>('count');

	if (loading) {
		return (
			<Card>
				<View className="min-h-[220px] items-center justify-center gap-3">
					<ActivityIndicator size="large" color="#2563eb" />
					<Text className="font-inter text-sm text-gray-500">
						Carregando dados do período...
					</Text>
				</View>
			</Card>
		);
	}

	const hasData = groups.some((g) => groupTotals(g).count > 0);

	if (!hasData) {
		return (
			<Card>
				<View className="min-h-[220px] items-center justify-center px-4">
					<View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100">
						<Inbox size={22} color="#6b7280" />
					</View>
					<Text className="font-inter-semibold text-base text-gray-800">
						Nenhum registro no período
					</Text>
					<Text className="mt-1 max-w-sm text-center font-inter text-sm text-gray-500">
						Não há dados entre {rangeLabel}. Tente selecionar um período maior.
					</Text>
				</View>
			</Card>
		);
	}

	const group =
		groups.find((g) => g.id === selectedId) ??
		groups.find((g) => groupTotals(g).count > 0) ??
		groups[0];
	const totals = groupTotals(group);
	const metric: ChartMetric = group.hasAmount ? chartMetric : 'count';
	const base = metric === 'amount' ? totals.amount : totals.count;

	const segments = group.statuses.map((s, i) => {
		const value = metric === 'amount' ? (s.amount ?? 0) : s.count;
		return {
			...s,
			color: COLORS[i % COLORS.length],
			pct: base > 0 ? (value / base) * 100 : 0,
		};
	});

	return (
		<Card>
			{/* Abas por tipo de registro */}
			<View accessibilityRole="tablist" className="flex-row flex-wrap gap-2">
				{groups.map((g) => {
					const selected = g.id === group.id;
					return (
						<Pressable
							key={g.id}
							accessibilityRole="tab"
							accessibilityState={{ selected }}
							onPress={() => setSelectedId(g.id)}
							className={`rounded-full border px-3.5 py-1.5 transition-colors ${
								selected
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100'
							}`}
						>
							<Text
								className={`text-xs md:text-sm ${
									selected
										? 'font-inter-semibold text-blue-700'
										: 'font-inter-medium text-gray-600'
								}`}
							>
								{g.title}
							</Text>
						</Pressable>
					);
				})}
			</View>
			<Text className="mt-2 font-inter text-xs text-gray-400">
				{rangeLabel}
			</Text>

			{totals.count === 0 ? (
				<View className="min-h-[160px] items-center justify-center">
					<Text className="text-center font-inter text-sm text-gray-500">
						Nenhum registro de {group.title.toLowerCase()} neste período.
					</Text>
				</View>
			) : (
				<View className="mt-4 gap-5 md:flex-row md:gap-10">
					{/* Resumo + gráfico */}
					<View className="gap-4 md:flex-1">
						<View className="flex-row gap-3">
							<View className="flex-1 rounded-xl bg-gray-50 p-3.5">
								<Text className="font-inter text-xs text-gray-500">
									Quantidade
								</Text>
								<Text className="mt-0.5 font-poppins-bold text-2xl text-gray-900 md:text-3xl">
									{totals.count}
								</Text>
							</View>
							{group.hasAmount && (
								<View className="flex-[1.4] rounded-xl bg-gray-50 p-3.5">
									<Text className="font-inter text-xs text-gray-500">
										Valor total
									</Text>
									<Text
										className="mt-0.5 font-poppins-bold text-xl text-gray-900 md:text-2xl"
										numberOfLines={1}
										adjustsFontSizeToFit
									>
										{formatCurrency(totals.amount)}
									</Text>
								</View>
							)}
						</View>

						<View>
							<View className="mb-2 flex-row items-center justify-between">
								<Text className="font-inter-medium text-xs text-gray-600">
									Distribuição por status
								</Text>
								{group.hasAmount && (
									<View className="flex-row rounded-lg bg-gray-100 p-0.5">
										{(['count', 'amount'] as const).map((m) => (
											<Pressable
												key={m}
												accessibilityRole="button"
												accessibilityState={{ selected: metric === m }}
												onPress={() => setChartMetric(m)}
												className={`rounded-md px-2.5 py-1 ${
													metric === m ? 'bg-white' : ''
												}`}
											>
												<Text
													className={`text-[11px] ${
														metric === m
															? 'font-inter-semibold text-gray-900'
															: 'font-inter-medium text-gray-500'
													}`}
												>
													{m === 'count' ? 'Qtd.' : 'Valor'}
												</Text>
											</Pressable>
										))}
									</View>
								)}
							</View>
							<View className="h-3 flex-row overflow-hidden rounded-full bg-gray-100">
								{segments.map(
									(s) =>
										s.pct > 0 && (
											<View
												key={s.status}
												style={{ width: `${s.pct}%`, backgroundColor: s.color }}
											/>
										),
								)}
							</View>
						</View>
					</View>

					{/* Legenda com quantidade e valor por status */}
					<View className="md:flex-1">
						{segments.map((s, i) => (
							<View
								key={s.status}
								className={`flex-row items-center gap-3 py-2.5 ${
									i < segments.length - 1 ? 'border-b border-gray-100' : ''
								}`}
							>
								<View
									className="h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: s.color }}
								/>
								<Text
									className="flex-1 font-inter text-sm text-gray-700"
									numberOfLines={1}
								>
									{s.label}
								</Text>
								<View className="items-end">
									<Text className="font-inter-semibold text-sm text-gray-900">
										{s.count}
									</Text>
									{group.hasAmount && s.amount !== null && (
										<Text className="font-inter text-xs text-gray-500">
											{formatCurrency(s.amount)}
										</Text>
									)}
								</View>
							</View>
						))}
					</View>
				</View>
			)}
		</Card>
	);
}
