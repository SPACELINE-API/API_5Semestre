import { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import {
	CheckCircle2,
	ClipboardCheck,
	ExternalLink,
	FileText,
} from 'lucide-react-native';
import { openDocument } from '../../../shared/components/FilePreview';
import type {
	ServiceOrderFile,
	ServiceOrderItem,
	Translator,
} from '../types/serviceOrder';
import { formatDate } from '../utils/format';
import {
	REVIEW_STATUS_LABELS,
	REVIEW_STATUS_STYLES,
	pendingReviewDeliveries,
	reviewedDeliveries,
} from '../utils/fileReview';
import { RequestChangesModal } from './RequestChangesModal';

import { useThemeColors } from '../../../shared/theme/ThemeProvider';
type ItemReviewTabProps = {
	items: ServiceOrderItem[];
	files: ServiceOrderFile[];
	translatorsById: Map<string, Translator>;
	onApprove: (file: ServiceOrderFile) => Promise<void>;
	onRequestChanges: (file: ServiceOrderFile, note: string) => Promise<boolean>;
};

function itemLabel(item: ServiceOrderItem | undefined): string {
	if (!item) return 'Item removido';
	return `${item.source_language} → ${item.target_language}${
		item.document_type ? ` · ${item.document_type}` : ''
	}`;
}

export function ItemReviewTab({
	items,
	files,
	translatorsById,
	onApprove,
	onRequestChanges,
}: ItemReviewTabProps) {
	const themeColors = useThemeColors();
	const [busyFileId, setBusyFileId] = useState<string | null>(null);
	const [changesTarget, setChangesTarget] = useState<ServiceOrderFile | null>(
		null,
	);

	const itemsById = new Map(items.map((item) => [item.id, item]));
	const pending = pendingReviewDeliveries(files);
	const history = reviewedDeliveries(files);

	function deliveredBy(file: ServiceOrderFile): string {
		const item = file.service_order_item_id
			? itemsById.get(file.service_order_item_id)
			: undefined;
		const translator = item?.translator_id
			? translatorsById.get(item.translator_id)
			: undefined;
		return translator?.name ?? 'Tradutor não identificado';
	}

	async function approve(file: ServiceOrderFile) {
		setBusyFileId(file.id);
		try {
			await onApprove(file);
		} finally {
			setBusyFileId(null);
		}
	}

	async function submitChanges(note: string) {
		if (!changesTarget) return;
		setBusyFileId(changesTarget.id);
		try {
			if (await onRequestChanges(changesTarget, note)) setChangesTarget(null);
		} finally {
			setBusyFileId(null);
		}
	}

	return (
		<View className="gap-8">
			<View className="gap-3">
				<View className="flex-row items-center gap-2">
					<ClipboardCheck size={16} color={themeColors.primary} />
					<Text className="font-inter font-bold text-foreground text-base">
						Aguardando revisão
					</Text>
					<View className="rounded-full bg-warning-soft px-2 py-0.5">
						<Text className="font-inter font-semibold text-warning-text text-xs">
							{pending.length}
						</Text>
					</View>
				</View>

				{pending.length === 0 ? (
					<View className="items-center justify-center rounded-xl border border-border-subtle py-10">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
							<CheckCircle2 size={18} color={themeColors.foregroundSubtle} />
						</View>
						<Text className="font-inter font-medium text-foreground text-sm">
							Nenhuma entrega aguardando revisão
						</Text>
						<Text className="mt-1 text-center font-inter text-foreground-subtle text-xs">
							Quando um tradutor enviar uma tradução, ela aparece aqui.
						</Text>
					</View>
				) : (
					pending.map((file) => {
						const item = file.service_order_item_id
							? itemsById.get(file.service_order_item_id)
							: undefined;
						const isBusy = busyFileId === file.id;

						return (
							<View
								key={file.id}
								className="gap-4 rounded-xl border border-border p-4"
							>
								<View className="gap-0.5">
									<Text className="font-inter font-semibold text-foreground text-sm">
										{itemLabel(item)}
									</Text>
									<Text className="font-inter text-foreground-muted text-xs">
										Enviado por {deliveredBy(file)} em{' '}
										{formatDate(file.uploaded_at)}
									</Text>
								</View>

								<TouchableOpacity
									onPress={() => openDocument(file.file_url)}
									activeOpacity={0.7}
									accessibilityRole="link"
									accessibilityLabel={`Abrir tradução ${file.filename}`}
									className="min-w-0 flex-row items-center gap-2 self-start"
								>
									<FileText size={15} color={themeColors.primary} />
									<Text
										className="min-w-0 flex-shrink font-inter font-medium text-primary-text text-sm"
										numberOfLines={1}
									>
										{file.filename}
									</Text>
									<ExternalLink size={12} color={themeColors.primaryText} />
								</TouchableOpacity>

								<View className="flex-row flex-wrap justify-end gap-3">
									<TouchableOpacity
										onPress={() => setChangesTarget(file)}
										disabled={isBusy}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel="Pedir ajustes"
										className="rounded-lg border border-border-strong px-4 py-2.5"
									>
										<Text className="font-inter font-medium text-foreground-secondary text-sm">
											Pedir ajustes
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => void approve(file)}
										disabled={isBusy}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel="Aprovar entrega"
										className={`flex-row items-center gap-2 rounded-lg bg-primary px-4 py-2.5 ${isBusy ? 'opacity-60' : ''}`}
									>
										{isBusy && (
											<ActivityIndicator
												size="small"
												color={themeColors.primaryForeground}
											/>
										)}
										<Text className="font-inter-medium text-sm text-primary-foreground">
											Aprovar
										</Text>
									</TouchableOpacity>
								</View>
							</View>
						);
					})
				)}
			</View>

			{history.length > 0 && (
				<View className="gap-3">
					<Text className="font-inter font-bold text-foreground text-base">
						Histórico de revisões
					</Text>
					{history.map((file) => {
						const item = file.service_order_item_id
							? itemsById.get(file.service_order_item_id)
							: undefined;
						const style = REVIEW_STATUS_STYLES[file.review_status];

						return (
							<View
								key={file.id}
								className="gap-2 rounded-xl border border-border-subtle p-4"
							>
								<View className="flex-row flex-wrap items-start justify-between gap-2">
									<View className="min-w-0 flex-1 gap-0.5">
										<Text className="font-inter font-semibold text-foreground text-sm">
											{itemLabel(item)}
										</Text>
										<Text className="font-inter text-foreground-muted text-xs">
											{deliveredBy(file)} · revisado em{' '}
											{formatDate(file.reviewed_at)}
										</Text>
									</View>
									<View
										className={`rounded-full px-2.5 py-0.5 ${style.background}`}
									>
										<Text
											className={`font-inter font-medium text-xs ${style.text}`}
										>
											{REVIEW_STATUS_LABELS[file.review_status]}
										</Text>
									</View>
								</View>
								{file.review_note && (
									<Text className="font-inter text-foreground-secondary text-sm">
										{file.review_note}
									</Text>
								)}
								<TouchableOpacity
									onPress={() => openDocument(file.file_url)}
									activeOpacity={0.7}
									accessibilityRole="link"
									className="min-w-0 flex-row items-center gap-2 self-start"
								>
									<FileText size={14} color={themeColors.primary} />
									<Text
										className="min-w-0 flex-shrink font-inter font-medium text-primary-text text-xs"
										numberOfLines={1}
									>
										{file.filename}
									</Text>
								</TouchableOpacity>
							</View>
						);
					})}
				</View>
			)}

			<RequestChangesModal
				visible={changesTarget !== null}
				subtitle={itemLabel(
					changesTarget?.service_order_item_id
						? itemsById.get(changesTarget.service_order_item_id)
						: undefined,
				)}
				isSubmitting={busyFileId !== null && busyFileId === changesTarget?.id}
				onClose={() => setChangesTarget(null)}
				onSubmit={(note) => void submitChanges(note)}
			/>
		</View>
	);
}
