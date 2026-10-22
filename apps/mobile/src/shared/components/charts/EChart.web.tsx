import { useEffect, useRef } from 'react';
import { init, use, type EChartsType } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import './registerCharts';
import type { EChartProps } from './types';

use([CanvasRenderer]);

export function EChart({
	option,
	height = 300,
	accessibilityLabel,
}: EChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<EChartsType | null>(null);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const chart = init(container, undefined, { renderer: 'canvas' });
		chartRef.current = chart;

		const observer = new ResizeObserver(() => chart.resize());
		observer.observe(container);

		return () => {
			observer.disconnect();
			chart.dispose();
			chartRef.current = null;
		};
	}, []);

	useEffect(() => {
		chartRef.current?.setOption(option, { notMerge: true });
	}, [option]);

	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={accessibilityLabel}
			style={{ width: '100%', height }}
		/>
	);
}
