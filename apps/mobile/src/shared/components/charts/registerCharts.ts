import { use } from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import {
	GridComponent,
	LegendComponent,
	TitleComponent,
	TooltipComponent,
} from 'echarts/components';
import { LegacyGridContainLabel } from 'echarts/features';

use([
	LegacyGridContainLabel,
	BarChart,
	LineChart,
	PieChart,
	GridComponent,
	LegendComponent,
	TitleComponent,
	TooltipComponent,
]);
