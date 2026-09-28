import { useLocalSearchParams } from 'expo-router';
import { ServiceOrderDetailsPage } from '../../modules/service-orders/pages/ServiceOrderDetailsPage';

export default function ServiceOrderDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();

	return <ServiceOrderDetailsPage id={id} />;
}
