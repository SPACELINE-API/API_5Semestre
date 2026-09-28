import { useLocalSearchParams } from 'expo-router';
import { CompanyDetailsPage } from '../../modules/clients/pages/CompanyDetailsPage';

export default function ClientDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();

	return <CompanyDetailsPage id={id} />;
}
