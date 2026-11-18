import {
	apiPost,
	apiUrl,
	request,
} from '../../../shared/services/publicApiClient';

export type CustomerQuoteStatus =
	'draft' | 'pending' | 'approved' | 'reproved' | 'cancelled';

export type CustomerQuote = {
	code: string;
	status: CustomerQuoteStatus;
	company_name: string | null;
	customer_name: string | null;
	items: {
		document_type: string | null;
		source_language: string;
		target_language: string;
		estimated_value: string | number | null;
	}[];
	additional_services: { description: string; price: string | number }[];
	total_value: string | number;
	valid_until: string | null;
	sent_to_customer_at: string | null;
	approved_at: string | null;
	reproved_at: string | null;
	reproval_reason: string | null;
	terms_accepted_at?: string | null;
};

export type CustomerDecision =
	| { status: 'approved'; terms_accepted: true }
	| { status: 'reproved'; reproval_reason: string };

export function getCustomerQuote(token: string) {
	return request<CustomerQuote>(
		`/api/public/quotes/${encodeURIComponent(token)}`,
	);
}

export function customerQuoteTermsUrl(token: string) {
	return `${apiUrl}/api/public/quotes/${encodeURIComponent(token)}/terms`;
}

export function decideCustomerQuote(token: string, decision: CustomerDecision) {
	return apiPost<CustomerQuote, CustomerDecision>(
		`/api/public/quotes/${encodeURIComponent(token)}/decision`,
		decision,
	);
}
