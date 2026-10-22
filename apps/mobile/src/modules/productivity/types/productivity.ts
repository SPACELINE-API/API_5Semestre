export type ProductivityIndicators = {
	documents_translated: number;
	total_words: number;
	total_value: string;
	projects_count: number;
	on_time_documents: number;
	late_documents: number;
	on_time_rate: number | null;
	average_turnaround_days: number | null;
};

export type TranslatorProductivity = ProductivityIndicators & {
	translator_id: string;
	translator_name: string;
};

export type ProductivityReport = {
	period_start: string;
	period_end: string;
	translator_id: string | null;
	service_order_id: string | null;
	summary: ProductivityIndicators;
	translators: TranslatorProductivity[];
};

export type ProductivityDeliveredFile = {
	id: string;
	filename: string;
	file_url: string;
	uploaded_at: string;
};

export type ProductivityDocument = {
	item_id: string;
	service_order_id: string;
	project_name: string;
	source_language: string;
	target_language: string;
	document_type: string | null;
	word_count: number | null;
	price: string | null;
	deadline: string | null;
	completed_at: string | null;
	on_time: boolean | null;
	original_file_url: string | null;
	delivered_files: ProductivityDeliveredFile[];
};

export type TranslatorProductivityDetails = TranslatorProductivity & {
	period_start: string;
	period_end: string;
	service_order_id: string | null;
	documents: ProductivityDocument[];
};

export type ProductivityFilterOptions = {
	translators: { id: string; name: string }[];
	projects: { id: string; project_name: string }[];
};

export type ProductivityFilters = {
	dateFrom: string;
	dateTo: string;
	translatorId: string;
	serviceOrderId: string;
};

export type ChartMetric = 'documents' | 'words' | 'value';
