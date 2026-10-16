import {
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { TranslatorProductivity } from '../types/productivity';
import {
	formatCurrencyValue,
	formatDays,
	formatInteger,
	formatPercent,
} from '../utils/format';

const WIDE_BREAKPOINT = 900;

type TranslatorsTableProps = {
	rows: TranslatorProductivity[];
	onSelect: (translatorId: string) => void;
};

const HEADERS = [
	{ label: 'Documentos', width: 'w-24' },
	{ label: 'Palavras', width: 'w-24' },
	{ label: 'Valor', width: 'w-32' },
	{ label: 'No prazo', width: 'w-24' },
	{ label: 'Atrasados', width: 'w-24' },
	{ label: 'Pontualidade', width: 'w-28' },
	{ label: 'Prazo médio', width: 'w-28' },
];

function cells(row: TranslatorProductivity) {
	return [
		formatInteger(row.documents_translated),
		formatInteger(row.total_words),
		formatCurrencyValue(row.total_value),
		formatInteger(row.on_time_documents),
		formatInteger(row.late_documents),
		formatPercent(row.on_time_rate),
		formatDays(row.average_turnaround_days),
	];
}

export function TranslatorsTable({ rows, onSelect }: TranslatorsTableProps) {
	const { width } = useWindowDimensions();
	const isWide = width >= WIDE_BREAKPOINT;

	if (!isWide) {
		return (
			<View className="gap-3">
				{rows.map((row) => (
					<TouchableOpacity
						key={row.translator_id}
						onPress={() => onSelect(row.translator_id)}
						activeOpacity={0.7}
						accessibilityRole="button"
						accessibilityLabel={`Ver detalhes de ${row.translator_name}`}
						className="gap-3 rounded-xl border border-gray-200 p-4"
					>
						<View className="flex-row items-center justify-between gap-2">
							<Text
								className="flex-1 font-inter font-semibold text-gray-900 text-sm"
								numberOfLines={1}
							>
								{row.translator_name}
							</Text>
							<ChevronRight size={17} color="#9CA3AF" />
						</View>
						<View className="flex-row flex-wrap gap-x-6 gap-y-3">
							{HEADERS.map((header, index) => (
								<View key={header.label} className="min-w-[88px] gap-0.5">
									<Text className="font-inter text-gray-400 text-xs">
										{header.label}
									</Text>
									<Text className="font-inter font-medium text-gray-800 text-sm">
										{cells(row)[index]}
									</Text>
								</View>
							))}
						</View>
					</TouchableOpacity>
				))}
			</View>
		);
	}

	return (
		<View className="overflow-hidden rounded-xl border border-gray-200">
			<View className="flex-row items-center border-b border-gray-200 bg-gray-50 px-4 py-3">
				<Text className="flex-1 font-inter font-semibold text-gray-500 text-xs uppercase">
					Profissional
				</Text>
				{HEADERS.map((header) => (
					<Text
						key={header.label}
						className={`${header.width} font-inter font-semibold text-gray-500 text-xs uppercase`}
					>
						{header.label}
					</Text>
				))}
				<View className="w-6" />
			</View>
			{rows.map((row) => (
				<TouchableOpacity
					key={row.translator_id}
					onPress={() => onSelect(row.translator_id)}
					activeOpacity={0.7}
					accessibilityRole="button"
					accessibilityLabel={`Ver detalhes de ${row.translator_name}`}
					className="flex-row items-center border-b border-gray-100 px-4 py-3.5 last:border-b-0"
				>
					<Text
						className="flex-1 font-inter font-semibold text-gray-900 text-sm"
						numberOfLines={1}
					>
						{row.translator_name}
					</Text>
					{HEADERS.map((header, index) => (
						<Text
							key={header.label}
							className={`${header.width} font-inter text-gray-700 text-sm`}
						>
							{cells(row)[index]}
						</Text>
					))}
					<View className="w-6 items-end">
						<ChevronRight size={17} color="#9CA3AF" />
					</View>
				</TouchableOpacity>
			))}
		</View>
	);
}
