import { apiGetAuth } from '../../../shared/services/apiClient';
import type {
	ProductivityFilterOptions,
	ProductivityFilters,
	ProductivityReport,
	TranslatorProductivityDetails,
} from '../types/productivity';
import { buildQueryString } from '../utils/filters';

const REPORTS_PATH = '/api/reports/productivity';

export function getProductivityFilterOptions(): Promise<ProductivityFilterOptions> {
	return apiGetAuth<ProductivityFilterOptions>(`${REPORTS_PATH}/filters`);
}

export function getProductivityReport(
	filters: ProductivityFilters,
): Promise<ProductivityReport> {
	return apiGetAuth<ProductivityReport>(
		`${REPORTS_PATH}?${buildQueryString(filters)}`,
	);
}

export function getTranslatorProductivity(
	translatorId: string,
	filters: ProductivityFilters,
): Promise<TranslatorProductivityDetails> {
	return apiGetAuth<TranslatorProductivityDetails>(
		`${REPORTS_PATH}/translators/${translatorId}?${buildQueryString({
			...filters,
			translatorId: '',
		})}`,
	);
}
