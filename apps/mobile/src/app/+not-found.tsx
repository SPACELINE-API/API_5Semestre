import { Redirect } from 'expo-router';
import {
	getAuthorizationContext,
	getSession,
} from '../modules/auth/services/auth';
import { firstAllowedRoute } from '../modules/auth/services/authorization';

export default function NotFoundRoute() {
	if (!getSession()) return <Redirect href={'/login' as never} />;
	return (
		<Redirect href={firstAllowedRoute(getAuthorizationContext()) as never} />
	);
}
