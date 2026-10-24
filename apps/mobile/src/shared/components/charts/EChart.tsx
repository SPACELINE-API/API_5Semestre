import { useMemo, useState } from 'react';
import {
	ActivityIndicator,
	Text,
	View,
	type LayoutChangeEvent,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import './registerCharts';
import { stripPointerEvents } from './svg';
import type { ChartOption, EChartProps } from './types';

use([SVGRenderer]);

function renderSvg(option: ChartOption, width: number, height: number) {
	const chart = init(null, undefined, {
		renderer: 'svg',
		ssr: true,
		width,
		height,
	});
	chart.setOption({ ...option, animation: false });
	const svg = stripPointerEvents(chart.renderToSVGString());
	chart.dispose();
	return svg;
}

export function EChart({
	option,
	height = 300,
	accessibilityLabel,
	showLoadingIndicator = false,
}: EChartProps) {
	const [width, setWidth] = useState(0);
	const [renderedSvg, setRenderedSvg] = useState<string | null>(null);

	const svg = useMemo(
		() => (width > 0 ? renderSvg(option, width, height) : null),
		[option, width, height],
	);
	const isLoading = showLoadingIndicator && (!svg || renderedSvg !== svg);

	function handleLayout(event: LayoutChangeEvent) {
		const next = Math.floor(event.nativeEvent.layout.width);
		setWidth((current) => (Math.abs(current - next) < 2 ? current : next));
	}

	return (
		<View
			onLayout={handleLayout}
			accessibilityRole={isLoading ? 'progressbar' : 'image'}
			accessibilityLabel={
				isLoading ? 'Carregando gráfico' : accessibilityLabel
			}
			accessibilityState={{ busy: isLoading }}
			style={{ width: '100%', height }}
		>
			{svg ? (
				<SvgXml
					key={svg}
					xml={svg}
					width={width}
					height={height}
					onLayout={() => setRenderedSvg(svg)}
					accessibilityElementsHidden={isLoading}
					importantForAccessibility={
						isLoading ? 'no-hide-descendants' : 'auto'
					}
				/>
			) : null}
			{isLoading ? (
				<View className="absolute inset-0 items-center justify-center bg-white">
					<ActivityIndicator color="#1C6FB0" />
					<Text className="mt-3 font-inter text-gray-400 text-xs">
						Carregando gráfico...
					</Text>
				</View>
			) : null}
		</View>
	);
}
