import { Redirect } from 'expo-router';
import { getSession } from '../modules/auth/services/auth';

export default function Index() {
	return <Redirect href={(getSession() ? '/dashboard' : '/login') as never} />;
}
