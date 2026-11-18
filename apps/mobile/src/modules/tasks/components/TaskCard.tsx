import { Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Paperclip } from 'lucide-react-native';
import type { Task } from '../types/task';
import { formatDueDate, personName } from '../utils/format';
import { TaskStatusBadge } from './TaskStatusBadge';

type TaskCardProps = {
	task: Task;
	showAssignee?: boolean;
	onPress: (task: Task) => void;
};

export function TaskCard({
	task,
	showAssignee = false,
	onPress,
}: TaskCardProps) {
	const attachments = task.attachments.length;

	return (
		<TouchableOpacity
			onPress={() => onPress(task)}
			activeOpacity={0.7}
			accessibilityRole="button"
			accessibilityLabel={`Abrir tarefa ${task.description}`}
			className="flex-row items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
		>
			<View className="flex-1 gap-2">
				<Text
					className="font-inter font-semibold text-gray-900 text-sm"
					numberOfLines={2}
				>
					{task.description}
				</Text>
				{showAssignee && (
					<Text className="font-inter text-gray-600 text-xs">
						Responsável: {personName(task.assignee)}
					</Text>
				)}
				<View className="flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
					<TaskStatusBadge status={task.status} />
					<Text className="font-inter text-gray-500 text-xs">
						Prazo: {formatDueDate(task.due_date)}
					</Text>
					{attachments > 0 && (
						<View className="flex-row items-center gap-1">
							<Paperclip size={12} color="#6B7280" />
							<Text className="font-inter text-gray-500 text-xs">
								{attachments} {attachments === 1 ? 'anexo' : 'anexos'}
							</Text>
						</View>
					)}
				</View>
			</View>
			<ChevronRight size={17} color="#9CA3AF" />
		</TouchableOpacity>
	);
}
