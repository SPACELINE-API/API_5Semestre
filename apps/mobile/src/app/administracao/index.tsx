import { Redirect } from 'expo-router';

export default function AdministrationIndex() {
	return <Redirect href={'/administracao/pessoas' as never} />;
}
