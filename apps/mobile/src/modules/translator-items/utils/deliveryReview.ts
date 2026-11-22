import type { DeliveredFile, DeliveredFileReviewStatus } from '../types/item';

export const DELIVERY_REVIEW_LABELS: Record<DeliveredFileReviewStatus, string> =
	{
		pending: 'Em revisão',
		approved: 'Aprovado',
		changes_requested: 'Ajustes solicitados',
	};

export const DELIVERY_REVIEW_STYLES: Record<
	DeliveredFileReviewStatus,
	{ background: string; text: string }
> = {
	pending: { background: 'bg-warning-soft', text: 'text-warning-text' },
	approved: { background: 'bg-success-soft', text: 'text-success-text' },
	changes_requested: { background: 'bg-danger-soft', text: 'text-danger-text' },
};

export function canSendDelivery(deliveredFiles: DeliveredFile[]): boolean {
	if (deliveredFiles.length === 0) return true;
	const latest = [...deliveredFiles].sort((a, b) =>
		b.uploaded_at.localeCompare(a.uploaded_at),
	)[0];
	return latest.review_status === 'changes_requested';
}

export function pendingChangesRequest(
	deliveredFiles: DeliveredFile[],
): DeliveredFile | null {
	const latest = [...deliveredFiles].sort((a, b) =>
		b.uploaded_at.localeCompare(a.uploaded_at),
	)[0];

	return latest && latest.review_status === 'changes_requested' ? latest : null;
}
