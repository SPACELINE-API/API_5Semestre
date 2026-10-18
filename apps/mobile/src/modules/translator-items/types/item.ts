export type DeliveredFileReviewStatus =
	'pending' | 'approved' | 'changes_requested';

export type DeliveredFile = {
	id: string;
	filename: string;
	file_url: string;
	review_status: DeliveredFileReviewStatus;
	review_note: string | null;
	reviewed_at: string | null;
	uploaded_at: string;
};

export type TranslatorItem = {
	id: string;
	source_language: string;
	target_language: string;
	document_type: string | null;
	file_url: string | null;
	word_count: number | null;
	price: string | null;
	deadline: string | null;
	status: string;
	delivered_files: DeliveredFile[];
};
