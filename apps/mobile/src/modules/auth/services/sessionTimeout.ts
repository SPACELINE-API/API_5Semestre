import { apiGetAuth, apiPatchAuth } from '../../../shared/services/apiClient';

const INACTIVITY_TIMEOUT_PATH = '/api/support/inactivity-timeout';

export type InactivityTimeout = {
	minutes: number;
};

export function getInactivityTimeout(): Promise<InactivityTimeout> {
	return apiGetAuth<InactivityTimeout>(INACTIVITY_TIMEOUT_PATH);
}

export function updateInactivityTimeout(
	minutes: number,
): Promise<InactivityTimeout> {
	return apiPatchAuth<InactivityTimeout, InactivityTimeout>(
		INACTIVITY_TIMEOUT_PATH,
		{ minutes },
	);
}
