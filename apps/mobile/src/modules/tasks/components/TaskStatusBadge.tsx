import { Text, View } from 'react-native';
import type { TaskStatus } from '../types/task';
import { TASK_STATUS_PRESENTATION } from '../utils/taskStatus';

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
	const { label, badge } = TASK_STATUS_PRESENTATION[status];

	return (
		<View
			className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${badge.background}`}
		>
			<View className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
			<Text className={`font-inter font-semibold text-xs ${badge.text}`}>
				{label}
			</Text>
		</View>
	);
}
