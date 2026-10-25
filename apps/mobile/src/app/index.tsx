import { Redirect } from 'expo-router';
import { getSession, isTranslatorSession } from '../modules/auth/services/auth';

export default function Index() {
	const target = getSession()
		? isTranslatorSession()
			? '/convites'
			: '/dashboard'
		: '/login';

	return <Redirect href={target as never} />;
}
