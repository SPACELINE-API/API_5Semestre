import { useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
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
}: EChartProps) {
	const [width, setWidth] = useState(0);

	const svg = useMemo(
		() => (width > 0 ? renderSvg(option, width, height) : null),
		[option, width, height],
	);

	function handleLayout(event: LayoutChangeEvent) {
		const next = Math.floor(event.nativeEvent.layout.width);
		setWidth((current) => (Math.abs(current - next) < 2 ? current : next));
	}

	return (
		<View
			onLayout={handleLayout}
			accessibilityRole="image"
			accessibilityLabel={accessibilityLabel}
			style={{ width: '100%', height }}
		>
			{svg && <SvgXml xml={svg} width={width} height={height} />}
		</View>
	);
}
