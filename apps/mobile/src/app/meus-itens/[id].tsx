import { useLocalSearchParams } from 'expo-router';
import { MyItemDetailsPage } from '../../modules/translator-items/pages/MyItemDetailsPage';

export default function MyItemDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();

	return <MyItemDetailsPage id={id} />;
}
