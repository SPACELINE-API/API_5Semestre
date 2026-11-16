import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, ClipboardList } from 'lucide-react-native';
import type { Task } from '../types/task';
import { TaskCard } from './TaskCard';

type TaskListProps = {
	tasks: Task[];
	isLoading: boolean;
	error: string | null;
	emptyTitle: string;
	emptyMessage: string;
	showAssignee?: boolean;
	onRetry: () => void;
	onOpen: (task: Task) => void;
};

export function TaskList({
	tasks,
	isLoading,
	error,
	emptyTitle,
	emptyMessage,
	showAssignee = false,
	onRetry,
	onOpen,
}: TaskListProps) {
	if (isLoading) {
		return (
			<View className="items-center justify-center py-16">
				<ActivityIndicator color="#6B7280" />
				<Text className="mt-3 font-inter text-gray-400 text-sm">
					Carregando tarefas...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="gap-3 py-8">
				<View className="flex-row items-center gap-2">
					<AlertCircle size={16} color="#DC2626" />
					<Text className="font-inter font-semibold text-red-600 text-sm">
						{error}
					</Text>
				</View>
				<TouchableOpacity
					onPress={onRetry}
					accessibilityRole="button"
					className="self-start rounded-lg border border-gray-300 px-4 py-2"
				>
					<Text className="font-inter text-gray-700 text-sm">
						Tentar novamente
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (tasks.length === 0) {
		return (
			<View className="items-center justify-center py-16">
				<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
					<ClipboardList size={18} color="#9CA3AF" />
				</View>
				<Text className="font-inter font-medium text-gray-800 text-sm">
					{emptyTitle}
				</Text>
				<Text className="mt-1 text-center font-inter text-gray-400 text-xs">
					{emptyMessage}
				</Text>
			</View>
		);
	}

	return (
		<View className="gap-3">
			{tasks.map((task) => (
				<TaskCard
					key={task.id}
					task={task}
					showAssignee={showAssignee}
					onPress={onOpen}
				/>
			))}
		</View>
	);
}
