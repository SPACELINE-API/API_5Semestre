import { useLocalSearchParams } from 'expo-router';
import { ServiceOrderDetailsPage } from '../../modules/service-orders/pages/ServiceOrderDetailsPage';

export default function ServiceOrderDetailsScreen() {
	const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();

	return <ServiceOrderDetailsPage id={id} initialTab={tab} />;
}
