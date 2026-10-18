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
