import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CheckCheck, PackagePlus, Pencil } from 'lucide-react-native';
import type { AdditionalService } from '../services/additionalService';
import { decimalStringToBRL } from '../../../shared/utils/currency';

const statusStyles: Record<string, { label: string; classes: string }> = {
	approved: { label: 'Concluído', classes: 'bg-emerald-50 text-emerald-700' },
	pending: { label: 'Pendente', classes: 'bg-gray-100 text-gray-700' },
	reproved: { label: 'Reprovado', classes: 'bg-red-50 text-red-700' },
};

function formatDate(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: date.toLocaleDateString('pt-BR', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			});
}

export function AdditionalServiceCard({
	service,
	onEdit,
	onMarkAsCompleted,
}: {
	service: AdditionalService;
	onEdit?: () => void;
	onMarkAsCompleted?: () => Promise<void>;
}) {
	const [isCompleting, setIsCompleting] = useState(false);
	const canMarkAsCompleted =
		service.status === 'pending' && Boolean(onMarkAsCompleted);

	async function handleMarkAsCompleted() {
		if (!onMarkAsCompleted) return;

		setIsCompleting(true);
		try {
			await onMarkAsCompleted();
		} catch {
			return;
		} finally {
			setIsCompleting(false);
		}
	}

	const status = statusStyles[service.status] ?? {
		label: service.status,
		classes: 'bg-gray-100 text-gray-700',
	};

	return (
		<View className="rounded-xl border border-gray-200 bg-white p-4">
			<View className="flex-row flex-wrap items-start justify-between gap-3">
				<View className="flex-row flex-1 items-center gap-3">
					<View className="h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
						<PackagePlus size={17} color="#4b5563" />
					</View>
					<View className="min-w-0 flex-1">
						<Text className="font-inter-semibold text-sm text-gray-900">
							{service.description}
						</Text>
						<View className="mt-1 flex-row flex-wrap items-center gap-2">
							<View
								className={`rounded-full px-2.5 py-1 ${status.classes.split(' ')[0]}`}
							>
								<Text
									className={`font-inter-medium text-xs ${status.classes.split(' ')[1]}`}
								>
									{status.label}
								</Text>
							</View>
						</View>
					</View>
				</View>
				<Text className="rounded-lg bg-blue-50 px-3 py-2 font-inter-semibold text-sm text-blue-700">
					{decimalStringToBRL(service.price)}
				</Text>
			</View>
			<View className="mt-3 flex-row items-center justify-between gap-3 border-t border-gray-100 pt-3">
				<Text className="font-inter text-xs text-gray-400">
					Criado em {formatDate(service.created_at)}
				</Text>
				<View className="flex-row items-center gap-4">
					{canMarkAsCompleted && (
						<TouchableOpacity
							onPress={handleMarkAsCompleted}
							disabled={isCompleting}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={`Marcar serviço adicional ${service.description} como concluído`}
							className={`flex-row items-center gap-1 py-1 ${isCompleting ? 'opacity-60' : ''}`}
						>
							<CheckCheck size={14} color="#047857" />
							<Text className="font-inter font-medium text-emerald-700 text-xs">
								{isCompleting ? 'Concluindo…' : 'Concluir'}
							</Text>
						</TouchableOpacity>
					)}
					{onEdit && service.status !== 'approved' && (
						<TouchableOpacity
							onPress={onEdit}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityLabel={`Editar serviço adicional ${service.description}`}
							className="flex-row items-center gap-1 py-1"
						>
							<Pencil size={14} color="#353535" />
							<Text className="font-inter font-medium text-gray-700 text-xs">
								Editar
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>
		</View>
	);
}
