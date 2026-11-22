import { ScrollView, Text, TouchableOpacity } from 'react-native';
import type { TaskStatus } from '../types/task';
import {
	TASK_STATUS_ORDER,
	TASK_STATUS_PRESENTATION,
} from '../utils/taskStatus';

export type TaskStatusFilterValue = TaskStatus | 'all';

type TaskStatusFilterProps = {
	value: TaskStatusFilterValue;
	total: number;
	counts: Record<TaskStatus, number>;
	onChange: (value: TaskStatusFilterValue) => void;
};

export function TaskStatusFilter({
	value,
	total,
	counts,
	onChange,
}: TaskStatusFilterProps) {
	const options: {
		key: TaskStatusFilterValue;
		label: string;
		count: number;
	}[] = [
		{ key: 'all', label: 'Todas', count: total },
		...TASK_STATUS_ORDER.map((status) => ({
			key: status,
			label: TASK_STATUS_PRESENTATION[status].label,
			count: counts[status],
		})),
	];

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerClassName="gap-2 pb-1"
		>
			{options.map((option) => {
				const selected = option.key === value;
				return (
					<TouchableOpacity
						key={option.key}
						onPress={() => onChange(option.key)}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={`Filtrar ${option.label}`}
						className={`rounded-full border px-3 py-1.5 ${
							selected
								? 'border-primary bg-primary-soft'
								: 'border-border bg-surface'
						}`}
					>
						<Text
							className={`font-inter text-xs ${
								selected
									? 'font-semibold text-primary-text'
									: 'font-medium text-foreground-secondary'
							}`}
						>
							{option.label} ({option.count})
						</Text>
					</TouchableOpacity>
				);
			})}
		</ScrollView>
	);
}
