import type { EChartsCoreOption } from 'echarts/core';

export type ChartOption = EChartsCoreOption;

export type EChartProps = {
	option: ChartOption;
	height?: number;
	accessibilityLabel: string;
	showLoadingIndicator?: boolean;
};
