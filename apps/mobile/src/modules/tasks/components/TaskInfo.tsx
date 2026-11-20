import { Text, View } from 'react-native';
import type { Task } from '../types/task';
import { formatDateTime, formatDueDate, personName } from '../utils/format';
import { showsRejectionReason } from '../utils/taskStatus';
import { TaskStatusBadge } from './TaskStatusBadge';

type InfoItemProps = {
	label: string;
	value: string;
	// NOMES E E-MAILS PRECISAM DE MAIS ESPACO PARA NAO QUEBRAR NO MEIO
	wide?: boolean;
};

function InfoItem({ label, value, wide = false }: InfoItemProps) {
	return (
		<View
			className={`${wide ? 'min-w-[220px]' : 'min-w-[140px]'} flex-1 gap-0.5`}
		>
			<Text className="font-inter text-foreground-muted text-xs">{label}</Text>
			<Text className="font-inter font-medium text-foreground text-sm">
				{value}
			</Text>
		</View>
	);
}

type TaskInfoProps = {
	task: Task;
	showAssignee?: boolean;
};

export function TaskInfo({ task, showAssignee = false }: TaskInfoProps) {
	return (
		<View className="gap-4">
			<View className="gap-2">
				<TaskStatusBadge status={task.status} />
				<Text className="font-inter text-foreground text-sm leading-5">
					{task.description}
				</Text>
			</View>

			<View className="flex-row flex-wrap gap-x-4 gap-y-3 rounded-xl border border-border p-4">
				<InfoItem label="Prazo" value={formatDueDate(task.due_date)} />
				<InfoItem label="Criada em" value={formatDateTime(task.created_at)} />
				{showAssignee && (
					<InfoItem
						label="Responsável"
						value={personName(task.assignee)}
						wide
					/>
				)}
				<InfoItem label="Solicitante" value={personName(task.requester)} wide />
				{task.reviewed_at && (
					<InfoItem
						label="Avaliada em"
						value={formatDateTime(task.reviewed_at)}
					/>
				)}
			</View>

			{showsRejectionReason(task) && (
				<View
					accessibilityLabel="Motivo da reprovação"
					className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3"
				>
					<Text className="font-inter text-danger-text text-sm">
						<Text className="font-semibold">
							{task.status === 'rejected'
								? 'Motivo da reprovação: '
								: 'Motivo da última reprovação: '}
						</Text>
						{task.rejection_reason}
					</Text>
				</View>
			)}
		</View>
	);
}
