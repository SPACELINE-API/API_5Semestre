import { useLocalSearchParams } from 'expo-router';
import { InviteDetailsPage } from '../../modules/invites/pages/InviteDetailsPage';

export default function InviteDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();

	return <InviteDetailsPage id={id} />;
}
