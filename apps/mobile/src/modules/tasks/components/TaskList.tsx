import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { AlertCircle, ClipboardList } from 'lucide-react-native';
import type { Task } from '../types/task';
import { TaskCard } from './TaskCard';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
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
	const themeColors = useThemeColors();
	if (isLoading) {
		return (
			<View className="items-center justify-center py-16">
				<ActivityIndicator color={themeColors.foregroundMuted} />
				<Text className="mt-3 font-inter text-foreground-subtle text-sm">
					Carregando tarefas...
				</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View className="gap-3 py-8">
				<View className="flex-row items-center gap-2">
					<AlertCircle size={16} color={themeColors.danger} />
					<Text className="font-inter font-semibold text-danger text-sm">
						{error}
					</Text>
				</View>
				<TouchableOpacity
					onPress={onRetry}
					accessibilityRole="button"
					className="self-start rounded-lg border border-border-strong px-4 py-2"
				>
					<Text className="font-inter text-foreground-secondary text-sm">
						Tentar novamente
					</Text>
				</TouchableOpacity>
			</View>
		);
	}

	if (tasks.length === 0) {
		return (
			<View className="items-center justify-center py-16">
				<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
					<ClipboardList size={18} color={themeColors.foregroundSubtle} />
				</View>
				<Text className="font-inter font-medium text-foreground text-sm">
					{emptyTitle}
				</Text>
				<Text className="mt-1 text-center font-inter text-foreground-subtle text-xs">
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
