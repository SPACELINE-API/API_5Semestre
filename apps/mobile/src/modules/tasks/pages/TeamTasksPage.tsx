import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { TaskList } from '../components/TaskList';
import { TaskReviewModal } from '../components/TaskReviewModal';
import {
	TaskStatusFilter,
	type TaskStatusFilterValue,
} from '../components/TaskStatusFilter';
import { useTasks } from '../hooks/useTasks';
import { listTeamTasks } from '../services/taskService';
import type { Task } from '../types/task';
import { personName } from '../utils/format';
import { countByStatus } from '../utils/taskStatus';

function normalize(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pt-BR');
}

// AREA ADMINISTRATIVA: TAREFAS DE TODOS OS FUNCIONARIOS INTERNOS
export function TeamTasksPage() {
	const { tasks, isLoading, error, refresh, replaceTask } =
		useTasks(listTeamTasks);
	const [filter, setFilter] = useState<TaskStatusFilterValue>('all');
	const [search, setSearch] = useState('');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { toast, showToast } = useToast();

	const term = normalize(search.trim());
	const matchingSearch = useMemo(
		() =>
			term
				? tasks.filter((task) =>
						normalize(
							`${personName(task.assignee)} ${task.assignee.email} ${task.description}`,
						).includes(term),
					)
				: tasks,
		[tasks, term],
	);
	const counts = useMemo(() => countByStatus(matchingSearch), [matchingSearch]);
	const visible =
		filter === 'all'
			? matchingSearch
			: matchingSearch.filter((task) => task.status === filter);
	const selected = tasks.find((task) => task.id === selectedId) ?? null;

	function handleReviewed(updated: Task, message: string) {
		replaceTask(updated);
		setSelectedId(null);
		showToast(message);
	}

	return (
		<View className="relative flex-1 bg-white">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<View className="mb-6 gap-4 border-b border-gray-200 pb-6">
					<View>
						<Text className="font-inter font-bold text-gray-950 text-2xl">
							Tarefas da equipe
						</Text>
						<Text className="mt-2 font-inter text-gray-500 text-sm">
							Acompanhe e avalie as tarefas dos funcionários internos.{' '}
							{counts.in_review > 0 &&
								`${counts.in_review} aguardando avaliação.`}
						</Text>
					</View>
					{!isLoading && !error && tasks.length > 0 && (
						<>
							<View className="flex-row items-center gap-2 rounded-lg border border-gray-300 px-3">
								<Search size={16} color="#9CA3AF" />
								<TextInput
									value={search}
									onChangeText={setSearch}
									placeholder="Buscar por funcionário ou descrição"
									placeholderTextColor="#9CA3AF"
									accessibilityLabel="Buscar tarefas"
									className="flex-1 py-2.5 font-inter text-sm text-gray-900 outline-none"
								/>
							</View>
							<TaskStatusFilter
								value={filter}
								total={matchingSearch.length}
								counts={counts}
								onChange={setFilter}
							/>
						</>
					)}
				</View>

				<TaskList
					tasks={visible}
					isLoading={isLoading}
					error={error}
					showAssignee
					emptyTitle={
						tasks.length === 0
							? 'Nenhuma tarefa cadastrada'
							: 'Nenhuma tarefa encontrada'
					}
					emptyMessage={
						tasks.length === 0
							? 'As tarefas criadas para os funcionários internos aparecem aqui.'
							: 'Ajuste a busca ou o filtro de status.'
					}
					onRetry={() => void refresh()}
					onOpen={(task) => setSelectedId(task.id)}
				/>
			</ScrollView>

			<TaskReviewModal
				task={selected}
				onClose={() => setSelectedId(null)}
				onReviewed={handleReviewed}
			/>
			<Toast toast={toast} />
		</View>
	);
}
