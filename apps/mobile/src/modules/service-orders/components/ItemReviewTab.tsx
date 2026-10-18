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
					<ClipboardCheck size={16} color="#1C6FB0" />
					<Text className="font-inter font-bold text-gray-900 text-base">
						Aguardando revisão
					</Text>
					<View className="rounded-full bg-amber-50 px-2 py-0.5">
						<Text className="font-inter font-semibold text-amber-900 text-xs">
							{pending.length}
						</Text>
					</View>
				</View>

				{pending.length === 0 ? (
					<View className="items-center justify-center rounded-xl border border-gray-100 py-10">
						<View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-gray-100">
							<CheckCircle2 size={18} color="#9CA3AF" />
						</View>
						<Text className="font-inter font-medium text-gray-800 text-sm">
							Nenhuma entrega aguardando revisão
						</Text>
						<Text className="mt-1 text-center font-inter text-gray-400 text-xs">
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
								className="gap-4 rounded-xl border border-gray-200 p-4"
							>
								<View className="gap-0.5">
									<Text className="font-inter font-semibold text-gray-900 text-sm">
										{itemLabel(item)}
									</Text>
									<Text className="font-inter text-gray-500 text-xs">
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
									<FileText size={15} color="#1C6FB0" />
									<Text
										className="min-w-0 flex-shrink font-inter font-medium text-blue-600 text-sm"
										numberOfLines={1}
									>
										{file.filename}
									</Text>
									<ExternalLink size={12} color="#1d4ed8" />
								</TouchableOpacity>

								<View className="flex-row flex-wrap justify-end gap-3">
									<TouchableOpacity
										onPress={() => setChangesTarget(file)}
										disabled={isBusy}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel="Pedir ajustes"
										className="rounded-lg border border-gray-300 px-4 py-2.5"
									>
										<Text className="font-inter font-medium text-gray-700 text-sm">
											Pedir ajustes
										</Text>
									</TouchableOpacity>
									<TouchableOpacity
										onPress={() => void approve(file)}
										disabled={isBusy}
										activeOpacity={0.7}
										accessibilityRole="button"
										accessibilityLabel="Aprovar entrega"
										className={`flex-row items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 ${isBusy ? 'opacity-60' : ''}`}
									>
										{isBusy && <ActivityIndicator size="small" color="#fff" />}
										<Text className="font-inter-medium text-sm text-white">
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
					<Text className="font-inter font-bold text-gray-900 text-base">
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
								className="gap-2 rounded-xl border border-gray-100 p-4"
							>
								<View className="flex-row flex-wrap items-start justify-between gap-2">
									<View className="min-w-0 flex-1 gap-0.5">
										<Text className="font-inter font-semibold text-gray-900 text-sm">
											{itemLabel(item)}
										</Text>
										<Text className="font-inter text-gray-500 text-xs">
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
									<Text className="font-inter text-gray-600 text-sm">
										{file.review_note}
									</Text>
								)}
								<TouchableOpacity
									onPress={() => openDocument(file.file_url)}
									activeOpacity={0.7}
									accessibilityRole="link"
									className="min-w-0 flex-row items-center gap-2 self-start"
								>
									<FileText size={14} color="#1C6FB0" />
									<Text
										className="min-w-0 flex-shrink font-inter font-medium text-blue-600 text-xs"
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
