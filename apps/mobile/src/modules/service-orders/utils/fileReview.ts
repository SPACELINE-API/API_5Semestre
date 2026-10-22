import type {
	FileReviewStatus,
	ServiceOrderFile,
	ServiceOrderItem,
} from '../types/serviceOrder';

export const REVIEW_STATUS_LABELS: Record<FileReviewStatus, string> = {
	pending: 'Aguardando revisão',
	approved: 'Aprovado',
	changes_requested: 'Ajustes solicitados',
};

export const REVIEW_STATUS_STYLES: Record<
	FileReviewStatus,
	{ background: string; text: string }
> = {
	pending: { background: 'bg-amber-50', text: 'text-amber-900' },
	approved: { background: 'bg-green-50', text: 'text-green-900' },
	changes_requested: { background: 'bg-red-50', text: 'text-red-900' },
};

function isDelivery(file: ServiceOrderFile): boolean {
	return file.direction === 'saida';
}

export function approvedDeliveries(
	files: ServiceOrderFile[],
): ServiceOrderFile[] {
	return files.filter(
		(file) => isDelivery(file) && file.review_status === 'approved',
	);
}

export function currentOutputDeliveries(
	files: ServiceOrderFile[],
): ServiceOrderFile[] {
	const outputFiles = files
		.filter(isDelivery)
		.sort(
			(a, b) =>
				a.uploaded_at.localeCompare(b.uploaded_at) || a.id.localeCompare(b.id),
		);
	const latestByItem = new Map<string, ServiceOrderFile>();
	const unlinked: ServiceOrderFile[] = [];
	for (const file of outputFiles) {
		if (file.service_order_item_id) {
			latestByItem.set(file.service_order_item_id, file);
		} else {
			unlinked.push(file);
		}
	}
	return [...unlinked, ...latestByItem.values()];
}

export function canFinalizeOrder(
	items: ServiceOrderItem[],
	files: ServiceOrderFile[],
): boolean {
	if (items.length === 0) return false;
	const current = currentOutputDeliveries(files);
	const approvedUnlinked = current.filter(
		(file) => !file.service_order_item_id && file.review_status === 'approved',
	);
	if (approvedUnlinked.some((file) => file.delivery_status !== 'sent')) {
		return false;
	}

	const latestByItem = new Map(
		current
			.filter((file) => file.service_order_item_id)
			.map((file) => [file.service_order_item_id as string, file]),
	);
	return items.every((item) => {
		const latest = latestByItem.get(item.id);
		if (!latest) return approvedUnlinked.length > 0;
		return (
			latest.review_status === 'approved' && latest.delivery_status === 'sent'
		);
	});
}

export function canCompleteOrder(
	orderStatus: string,
	files: ServiceOrderFile[],
	items: ServiceOrderItem[] = [],
): boolean {
	if (orderStatus === 'concluida') return false;
	if (files.length === 0) return true;
	const current = currentOutputDeliveries(files);
	if (current.length === 0) return false;
	return (
		current.some(
			(file) =>
				file.review_status === 'approved' && file.delivery_status !== 'sent',
		) || canFinalizeOrder(items, files)
	);
}

export function pendingReviewDeliveries(
	files: ServiceOrderFile[],
): ServiceOrderFile[] {
	return files.filter(
		(file) => isDelivery(file) && file.review_status === 'pending',
	);
}

export function reviewedDeliveries(
	files: ServiceOrderFile[],
): ServiceOrderFile[] {
	return files.filter(
		(file) =>
			isDelivery(file) &&
			Boolean(file.service_order_item_id) &&
			file.review_status !== 'pending',
	);
}

export function countApprovedDeliveries(
	files: ServiceOrderFile[],
	items: ServiceOrderItem[],
): number {
	return Math.min(approvedDeliveries(files).length, items.length);
}

export function reviewableFiles(files: ServiceOrderFile[]): ServiceOrderFile[] {
	return files
		.filter((file) => isDelivery(file) && Boolean(file.service_order_item_id))
		.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}
