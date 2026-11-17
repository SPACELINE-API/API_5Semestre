import { Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import {
	WORKFLOW_CURRENT_BAND_CLASS,
	WORKFLOW_STEPS,
} from '../../service-orders/utils/workflowSteps';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type InviteItemProgressProps = {
	status: string;
};

function remainingLabel(remaining: number) {
	if (remaining === 0) return 'Todas as etapas foram concluídas';
	return remaining === 1 ? 'Falta 1 etapa' : `Faltam ${remaining} etapas`;
}

export function InviteItemProgress({ status }: InviteItemProgressProps) {
	const themeColors = useThemeColors();
	const currentIndex = WORKFLOW_STEPS.findIndex(
		(step) => step.status === status,
	);

	if (currentIndex === -1) return null;

	const lastIndex = WORKFLOW_STEPS.length - 1;
	const remaining = lastIndex - currentIndex;

	return (
		<View className="gap-4 rounded-xl border border-border-subtle p-4">
			<View className="gap-0.5">
				<Text className="font-inter font-semibold text-foreground text-sm">
					Progresso do item
				</Text>
				<Text className="font-inter text-foreground-muted text-xs">
					Etapa {currentIndex + 1} de {WORKFLOW_STEPS.length} ·{' '}
					{remainingLabel(remaining)}
				</Text>
			</View>

			<View>
				{WORKFLOW_STEPS.map((step, index) => {
					const isDone = index < currentIndex;
					const isCurrent = index === currentIndex;
					const isLast = index === lastIndex;

					return (
						<View key={step.status} className="flex-row gap-3">
							<View className="items-center">
								<View
									className={`h-6 w-6 items-center justify-center rounded-full ${
										isDone
											? 'bg-success'
											: isCurrent
												? WORKFLOW_CURRENT_BAND_CLASS[step.status]
												: 'bg-border'
									}`}
								>
									{isDone ? (
										<Check
											size={13}
											color={themeColors.primaryForeground}
											strokeWidth={3}
										/>
									) : (
										<View
											className={`h-2 w-2 rounded-full ${isCurrent ? 'bg-surface' : 'bg-foreground-subtle'}`}
										/>
									)}
								</View>
								{!isLast && (
									<View
										className={`my-1 w-0.5 flex-1 ${isDone ? 'bg-success' : 'bg-border'}`}
										style={{ minHeight: 16 }}
									/>
								)}
							</View>

							<View className={`flex-1 ${isLast ? '' : 'pb-3'}`}>
								<Text
									className={`font-inter text-sm ${
										isCurrent
											? 'font-semibold text-foreground'
											: isDone
												? 'font-medium text-foreground-secondary'
												: 'text-foreground-subtle'
									}`}
								>
									{step.title}
								</Text>
								<Text className="font-inter text-foreground-muted text-xs">
									{isDone
										? step.doneLabel
										: isCurrent
											? 'Etapa atual'
											: step.upcomingLabel}
								</Text>
							</View>
						</View>
					);
				})}
			</View>
		</View>
	);
}
