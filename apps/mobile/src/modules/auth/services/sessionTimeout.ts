import { apiGetAuth, apiPatchAuth } from '../../../shared/services/apiClient';

const INACTIVITY_TIMEOUT_PATH = '/api/support/inactivity-timeout';

export type InactivityTimeout = {
	minutes: number;
};

type InactivityTimeoutListener = (minutes: number) => void;

const inactivityTimeoutListeners = new Set<InactivityTimeoutListener>();

export function onInactivityTimeoutChange(listener: InactivityTimeoutListener) {
	inactivityTimeoutListeners.add(listener);
	return () => {
		inactivityTimeoutListeners.delete(listener);
	};
}

export function getInactivityTimeout(): Promise<InactivityTimeout> {
	return apiGetAuth<InactivityTimeout>(INACTIVITY_TIMEOUT_PATH);
}

export async function updateInactivityTimeout(
	minutes: number,
): Promise<InactivityTimeout> {
	const updated = await apiPatchAuth<InactivityTimeout, InactivityTimeout>(
		INACTIVITY_TIMEOUT_PATH,
		{ minutes },
	);
	inactivityTimeoutListeners.forEach((listener) => listener(updated.minutes));
	return updated;
}
