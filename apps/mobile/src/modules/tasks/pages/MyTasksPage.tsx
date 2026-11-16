import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { TaskDetailsModal } from '../components/TaskDetailsModal';
import { TaskList } from '../components/TaskList';
import {
	TaskStatusFilter,
	type TaskStatusFilterValue,
} from '../components/TaskStatusFilter';
import { useTasks } from '../hooks/useTasks';
import { listMyTasks } from '../services/taskService';
import { countByStatus } from '../utils/taskStatus';

export function MyTasksPage() {
	const { tasks, isLoading, error, refresh, replaceTask } =
		useTasks(listMyTasks);
	const [filter, setFilter] = useState<TaskStatusFilterValue>('all');
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const counts = useMemo(() => countByStatus(tasks), [tasks]);
	const visible =
		filter === 'all' ? tasks : tasks.filter((task) => task.status === filter);
	const selected = tasks.find((task) => task.id === selectedId) ?? null;

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-6 gap-4 border-b border-gray-200 pb-6">
					<View>
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Minhas tarefas
						</Text>
						<Text className="mt-2 font-inter text-gray-500 text-sm">
							{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}{' '}
							destinadas a você
						</Text>
					</View>
					{!isLoading && !error && tasks.length > 0 && (
						<TaskStatusFilter
							value={filter}
							total={tasks.length}
							counts={counts}
							onChange={setFilter}
						/>
					)}
				</View>

				<TaskList
					tasks={visible}
					isLoading={isLoading}
					error={error}
					emptyTitle={
						tasks.length === 0
							? 'Nenhuma tarefa destinada a você'
							: 'Nenhuma tarefa com este status'
					}
					emptyMessage={
						tasks.length === 0
							? 'Quando uma tarefa for criada para você, ela aparece aqui.'
							: 'Escolha outro filtro para ver as demais tarefas.'
					}
					onRetry={() => void refresh()}
					onOpen={(task) => setSelectedId(task.id)}
				/>
			</ScrollView>

			<TaskDetailsModal
				task={selected}
				onClose={() => setSelectedId(null)}
				onChanged={replaceTask}
			/>
		</View>
	);
}
