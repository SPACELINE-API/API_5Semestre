import { useSyncExternalStore } from 'react';
import {
	getAuthorizationContext,
	subscribeAuthorizationContext,
} from '../services/auth';
import { hasPermission } from '../services/authorization';

export function usePermission(permission: string) {
	const context = useSyncExternalStore(
		subscribeAuthorizationContext,
		getAuthorizationContext,
		getAuthorizationContext,
	);
	return hasPermission(context, permission);
}
