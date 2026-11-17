import { useSyncExternalStore } from 'react';
import { Redirect } from 'expo-router';
import {
	getAuthorizationContext,
	getSession,
	subscribeAuthorizationContext,
} from '../modules/auth/services/auth';
import { firstAllowedRoute } from '../modules/auth/services/authorization';

export default function Index() {
	const context = useSyncExternalStore(
		subscribeAuthorizationContext,
		getAuthorizationContext,
		getAuthorizationContext,
	);
	const session = getSession();

	if (!session) return <Redirect href={'/login' as never} />;
	if (!context) return null;

	return <Redirect href={firstAllowedRoute(context) as never} />;
}
