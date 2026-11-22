import { useMemo, useState } from 'react';
import { SearchTextInput } from '../../../shared/components/SearchTextInput';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { Toast } from '../../../shared/components/Toast';
import { useToast } from '../../../shared/hooks/useToast';
import { usePermission } from '../../auth/hooks/usePermission';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskList } from '../components/TaskList';
import { TaskReviewModal } from '../components/TaskReviewModal';
import {
	TaskStatusFilter,
	type TaskStatusFilterValue,
} from '../components/TaskStatusFilter';
import { TasksHeader } from '../components/TasksHeader';
import { useTasks } from '../hooks/useTasks';
import { listTasksAssignedByMe, listTeamTasks } from '../services/taskService';
import type { Task } from '../types/task';
import { personName } from '../utils/format';
import { countByStatus } from '../utils/taskStatus';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type Scope = 'mine' | 'team';

function normalize(value: string) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pt-BR');
}

// CRIACAO E ACOMPANHAMENTO DAS TAREFAS ATRIBUIDAS PELO USUARIO
export function AssignedTasksPage() {
	const themeColors = useThemeColors();
	const canReview = usePermission('tasks.review');
	const [scope, setScope] = useState<Scope>('mine');
	const { tasks, isLoading, error, refresh, replaceTask, addTask } = useTasks(
		scope === 'team' ? listTeamTasks : listTasksAssignedByMe,
	);
	const [filter, setFilter] = useState<TaskStatusFilterValue>('all');
	const [search, setSearch] = useState('');
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
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

	function handleCreated(task: Task) {
		addTask(task);
		setIsCreating(false);
		showToast(`Tarefa atribuída a ${personName(task.assignee)}.`);
	}

	function handleReviewed(updated: Task, message: string) {
		replaceTask(updated);
		setSelectedId(null);
		showToast(message);
	}

	return (
		<View className="relative flex-1 bg-surface">
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerClassName="px-5 py-6 md:px-10 md:py-8 md:max-w-[1200px] md:w-full md:self-center"
			>
				<TasksHeader active="atribuidas" />

				<View className="mb-6 gap-4">
					<View className="flex-row flex-wrap items-center justify-between gap-3">
						<Text className="font-inter text-foreground-muted text-sm">
							{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
							{counts.in_review > 0
								? ` · ${counts.in_review} aguardando avaliação`
								: ''}
						</Text>
						<TouchableOpacity
							onPress={() => setIsCreating(true)}
							activeOpacity={0.8}
							accessibilityRole="button"
							accessibilityLabel="Nova tarefa"
							className="flex-row items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5"
						>
							<Plus size={18} color={themeColors.primaryForeground} />
							<Text className="font-inter font-medium text-sm text-primary-foreground">
								Nova tarefa
							</Text>
						</TouchableOpacity>
					</View>

					{/* QUEM AVALIA TAMBEM CONSULTA AS TAREFAS DE TODA A EQUIPE */}
					{canReview && (
						<View className="flex-row gap-2">
							{(
								[
									{ key: 'mine', label: 'Atribuídas por mim' },
									{ key: 'team', label: 'Toda a equipe' },
								] as const
							).map((option) => {
								const selectedScope = option.key === scope;
								return (
									<TouchableOpacity
										key={option.key}
										onPress={() => setScope(option.key)}
										accessibilityRole="button"
										accessibilityState={{ selected: selectedScope }}
										accessibilityLabel={`Mostrar ${option.label.toLowerCase()}`}
										className={`rounded-lg border px-3 py-1.5 ${
											selectedScope
												? 'border-primary bg-primary-soft'
												: 'border-border bg-surface'
										}`}
									>
										<Text
											className={`font-inter text-xs ${
												selectedScope
													? 'font-semibold text-primary-text'
													: 'font-medium text-foreground-secondary'
											}`}
										>
											{option.label}
										</Text>
									</TouchableOpacity>
								);
							})}
						</View>
					)}

					{!isLoading && !error && tasks.length > 0 && (
						<>
							<View className="flex-row items-center gap-2 rounded-lg border border-border-strong px-3">
								<Search size={16} color={themeColors.foregroundSubtle} />
								<SearchTextInput
									value={search}
									onChangeText={setSearch}
									placeholder="Buscar por funcionário ou descrição"
									numberOfLines={1}
									placeholderTextColor={themeColors.foregroundSubtle}
									accessibilityLabel="Buscar tarefas"
									className="flex-1 py-2.5 font-inter text-ellipsis text-sm text-foreground outline-none"
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
							? scope === 'team'
								? 'Nenhuma tarefa cadastrada'
								: 'Você ainda não atribuiu tarefas'
							: 'Nenhuma tarefa encontrada'
					}
					emptyMessage={
						tasks.length === 0
							? 'Use “Nova tarefa” para atribuir uma tarefa a um funcionário interno.'
							: 'Ajuste a busca ou o filtro de status.'
					}
					onRetry={() => void refresh()}
					onOpen={(task) => setSelectedId(task.id)}
				/>
			</ScrollView>

			<CreateTaskModal
				visible={isCreating}
				onClose={() => setIsCreating(false)}
				onCreated={handleCreated}
			/>
			<TaskReviewModal
				task={selected}
				canReview={canReview}
				onClose={() => setSelectedId(null)}
				onReviewed={handleReviewed}
			/>
			<Toast toast={toast} />
		</View>
	);
}
